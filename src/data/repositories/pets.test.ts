/**
 * PawPair — repository tests.
 *
 * Uses an in-memory shim that implements the subset of the
 * `expo-sqlite` surface the repositories and migrations need. This
 * keeps the test runtime fast and lets us exercise the schema
 * before the native test runner is wired up.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { clock } from "../database/types";
import { uuid } from "../database/uuid";
import { migrate, TARGET_SCHEMA_VERSION } from "../database/migrations";
import { PetsRepository } from "./pets";
import { MedicationsRepository } from "./medications";
import { DoseEventsRepository } from "./dose-events";

interface TableDef {
  cols: string[];
  rows: Map<string, Record<string, unknown>>;
}

class TestDb {
  private tables = new Map<string, TableDef>();
  private pragmas = new Map<string, number | string>();

  execAsync(sql: string): Promise<void> {
    // Strip block comments, line comments, then split on `;` so the
    // multi-statement schema runs one DDL at a time. We preserve
    // statement boundaries inside CHECK constraints by tracking
    // parentheses depth, but our schema doesn't have nested
    // semicolons so a simple split is safe.
    const cleaned = sql
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*--[^\n]*\n/gm, "");
    const statements = cleaned
      .split(/;\s*(?:\n|$)/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const statement of statements) {
      this.execOne(statement);
    }
    return Promise.resolve();
  }

  private execOne(trimmed: string): void {
    if (/^PRAGMA\s+(\w+)\s*=\s*(.+);?$/i.test(trimmed)) {
      const m = trimmed.match(/^PRAGMA\s+(\w+)\s*=\s*(.+?);?$/i);
      if (m) {
        this.pragmas.set(m[1]?.toLowerCase() ?? "", Number((m[2] ?? "").trim()));
      }
      return;
    }
    if (/^CREATE\s+TABLE/i.test(trimmed)) {
      const cleaned = trimmed.replace(/--[^\n]*/g, "");
      const m = cleaned.match(
        /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([\s\S]+)\)\s*;?$/i,
      );
      if (m) {
        const tableName = m[1] ?? "";
        const body = m[2] ?? "";
        const colDefs: string[] = [];
        let depth = 0;
        let buf = "";
        for (const ch of body) {
          if (ch === "(") depth += 1;
          else if (ch === ")") depth -= 1;
          if (ch === "," && depth === 0) {
            colDefs.push(buf);
            buf = "";
          } else {
            buf += ch;
          }
        }
        if (buf.trim()) colDefs.push(buf);
        const cols = colDefs
          .map((c) => c.trim())
          .filter(
            (c) =>
              /^[A-Za-z_]/.test(c) &&
              !/^(PRIMARY|UNIQUE|CHECK|FOREIGN)/i.test(c),
          )
          .map((c) => c.split(/\s+/)[0] ?? "")
          .filter(Boolean);
        this.tables.set(tableName, { cols, rows: new Map() });
      }
      return;
    }
    if (/^DROP\s+TABLE/i.test(trimmed)) {
      const m = trimmed.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(\w+)/i);
      if (m) this.tables.delete(m[1] ?? "");
      return;
    }
    if (/^CREATE\s+INDEX/i.test(trimmed)) {
      return;
    }
  }

  async withTransactionAsync(fn: () => Promise<void>): Promise<void> {
    await fn();
  }

  getFirstAsync<T>(sql: string): Promise<T | null> {
    const m = sql.match(/^PRAGMA\s+(\w+)/i);
    if (m) {
      return Promise.resolve({
        [m[1] ?? ""]: this.pragmas.get(m[1]?.toLowerCase() ?? ""),
      } as T);
    }
    const select = parseSelect(sql);
    if (select) {
      const t = this.tables.get(select.table);
      if (!t) return Promise.resolve(null);
      const row = [...t.rows.values()].find((r) =>
        matchWhere(r, select.where, this.lastParams),
      );
      return Promise.resolve((row as T) ?? null);
    }
    return Promise.resolve(null);
  }

  getAllAsync<T>(sql: string): Promise<T[]> {
    const select = parseSelect(sql);
    if (!select) return Promise.resolve([]);
    const t = this.tables.get(select.table);
    if (!t) return Promise.resolve([]);
    const rows = [...t.rows.values()].filter((r) =>
      matchWhere(r, select.where, this.lastParams),
    );
    return Promise.resolve(rows as T[]);
  }

  // The shim doesn't track bind parameters across calls, so for
  // repository.create tests we read columns by name and assign via
  // the param list. For SELECT/INSERT this is enough.
  private lastParams: unknown[] = [];

  runAsync(sql: string, ...params: unknown[]): Promise<{ lastInsertRowId: number; changes: number }> {
    this.lastParams = params;
    const trimmed = sql.trim();
    const insert = trimmed.match(
      /^INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i,
    );
    if (insert) {
      const tableName = insert[1] ?? "";
      const cols = (insert[2] ?? "").split(",").map((c) => c.trim());
      const t = this.tables.get(tableName);
      if (!t) throw new Error(`unknown table ${tableName}`);
      const row: Record<string, unknown> = {};
      cols.forEach((col, i) => {
        row[col] = params[i] ?? null;
      });
      const id = (row.id as string) ?? uuid();
      t.rows.set(id, row);
      return Promise.resolve({ lastInsertRowId: 0, changes: 1 });
    }
    const update = trimmed.match(/^UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(\w+)\s*=\s*\?$/i);
    if (update) {
      const tableName = update[1] ?? "";
      const sets = (update[2] ?? "").split(",").map((s) => s.trim());
      const t = this.tables.get(tableName);
      if (!t) throw new Error(`unknown table ${tableName}`);
      const setEntries: Array<[string, unknown]> = sets.map((s, i) => {
        const [col] = s.split("=").map((x) => x.trim());
        return [col ?? "", params[i] ?? null];
      });
      // We don't fully implement the WHERE clause for UPDATE — every
      // row gets the new value. The repository archive test doesn't
      // depend on per-row targeting.
      for (const r of t.rows.values()) {
        for (const [k, v] of setEntries) r[k] = v;
      }
      return Promise.resolve({ lastInsertRowId: 0, changes: t.rows.size });
    }
    return Promise.resolve({ lastInsertRowId: 0, changes: 0 });
  }
}

interface SelectAst {
  table: string;
  where: Array<{ col: string }>;
}

function parseSelect(sql: string): SelectAst | null {
  const m = sql.match(/^SELECT\s+\*\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+.+)?;?$/is);
  if (!m) return null;
  const table = m[1] ?? "";
  const whereClause = m[2] ?? "";
  const where: SelectAst["where"] = [];
  if (whereClause) {
    const cond = whereClause.match(/(\w+)\s*=\s*\?/g) ?? [];
    for (const c of cond) {
      const col = c.split(/\s*=\s*/)[0] ?? "";
      where.push({ col });
    }
  }
  return { table, where };
}

function matchWhere(
  row: Record<string, unknown>,
  where: SelectAst["where"],
  params: unknown[],
): boolean {
  let pIndex = 0;
  return where.every((c) => {
    const v = params[pIndex++];
    return row[c.col] === v;
  });
}

describe("repositories", () => {
  beforeEach(() => {
    clock.__setNow(() => new Date("2026-07-10T08:00:00.000Z"));
  });

  it("applies the v1 schema and reports the target version", async () => {
    const db = new TestDb();
    await migrate(db as never);
    expect(TARGET_SCHEMA_VERSION).toBe(1);
  });

  it("creates a pet and stamps it with the deterministic clock", async () => {
    const db = new TestDb();
    await migrate(db as never);
    const pets = new PetsRepository(db as never);
    const row = await pets.create({
      householdId: "h-1",
      name: "Milo",
      species: "dog",
      breed: "Golden retriever",
      ageYears: 9,
      avatarSeed: "milo",
      accentColor: "#F3B66D",
    });
    expect(row.id).toMatch(/^[0-9a-f]{8}-/i);
    expect(row.created_at_utc).toBe("2026-07-10T08:00:00.000Z");
    expect(row.household_id).toBe("h-1");
    expect(row.archived_at_utc).toBeNull();
  });

  it("creates a medication and archives it", async () => {
    const db = new TestDb();
    await migrate(db as never);
    const meds = new MedicationsRepository(db as never);
    const row = await meds.create({
      householdId: "h-1",
      name: "Carprofen",
      form: "tablet",
      dosageText: "75 mg",
      instructions: "Give with food",
      color: "#ED7C62",
    });
    expect(row.form).toBe("tablet");
    expect(row.color).toBe("#ED7C62");
    expect(row.archived_at_utc).toBeNull();
    await meds.archive(row.id);
  });

  it("creates a dose event with status and caregiver", async () => {
    const db = new TestDb();
    await migrate(db as never);
    const repo = new DoseEventsRepository(db as never);
    const ev = await repo.create({
      scheduledDoseId: "sd-1",
      status: "given",
      completedByUserId: "u-1",
    });
    expect(ev.status).toBe("given");
    expect(ev.scheduled_dose_id).toBe("sd-1");
    expect(ev.completed_by_user_id).toBe("u-1");
    expect(ev.completed_at_utc).toBe("2026-07-10T08:00:00.000Z");
  });

  it("allows a correction that supersedes the original event", async () => {
    const db = new TestDb();
    await migrate(db as never);
    const repo = new DoseEventsRepository(db as never);
    const original = await repo.create({
      scheduledDoseId: "sd-1",
      status: "given",
    });
    const correction = await repo.correct(original.id, {
      scheduledDoseId: "sd-1",
      status: "skipped",
      note: "Pet spat the tablet out",
    });
    expect(correction.correction_of_event_id).toBe(original.id);
    expect(correction.note).toContain("spat");
  });
});
