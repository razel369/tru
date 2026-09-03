/**
 * PawPair — migrations and schema integration tests.
 *
 * We do not import `./index` (the public barrel) here because the
 * barrel pulls in the SQLite connection which transitively loads
 * react-native. Tests import only the pure modules.
 */

import { describe, expect, it, beforeEach } from "vitest";

import { clock } from "./types";
import { uuid } from "./uuid";
import { TARGET_SCHEMA_VERSION, migrate, getCurrentSchemaVersion } from "./migrations";

/**
 * In-memory SQLite shim. Implements just enough of the surface used
 * by the migrations runner to support these tests.
 */
class InMemoryDb {
  private tables = new Map<string, Map<string, unknown>>();
  private pragmas = new Map<string, number | string>();

  execAsync(sql: string): Promise<void> {
    const trimmed = sql.trim();
    if (/^PRAGMA\s+(\w+)\s*=\s*(.+);?$/i.test(trimmed)) {
      const m = trimmed.match(/^PRAGMA\s+(\w+)\s*=\s*(.+?);?$/i);
      if (m) {
        const key = m[1]?.toLowerCase() ?? "";
        const raw = (m[2] ?? "").trim();
        this.pragmas.set(key, Number.isFinite(Number(raw)) ? Number(raw) : raw);
      }
      return Promise.resolve();
    }
    if (/^DROP\s+TABLE/i.test(trimmed)) {
      const m = trimmed.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?"?(\w+)"?/i);
      if (m) this.tables.delete(m[1] ?? "");
      return Promise.resolve();
    }
    if (/^CREATE\s+TABLE/i.test(trimmed)) {
      const m = trimmed.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?/i);
      if (m) this.tables.set(m[1] ?? "", new Map());
      return Promise.resolve();
    }
    if (/^CREATE\s+INDEX/i.test(trimmed) || /^CREATE\s+UNIQUE\s+INDEX/i.test(trimmed)) {
      return Promise.resolve();
    }
    return Promise.resolve();
  }

  async withTransactionAsync(fn: () => Promise<void>): Promise<void> {
    await fn();
  }

  getFirstAsync<T>(sql: string): Promise<T | null> {
    const m = sql.match(/^PRAGMA\s+(\w+)/i);
    if (m) {
      const value = this.pragmas.get(m[1]?.toLowerCase() ?? "");
      return Promise.resolve({ [m[1] ?? ""]: value } as T);
    }
    return Promise.resolve(null);
  }
}

describe("migrations", () => {
  beforeEach(() => {});

  it("has registered v1 and v2 migrations that match the target", () => {
    expect(TARGET_SCHEMA_VERSION).toBe(2);
  });

  it("applies v1 and v2 from a clean state", async () => {
    const db = new InMemoryDb();
    const result = await migrate(db as never);
    expect(result.from).toBe(0);
    expect(result.to).toBe(2);
    expect(result.applied).toHaveLength(2);
    expect(result.applied[0]?.name).toBe("initial_schema");
    expect(result.applied[1]?.name).toBe("care_state_snapshots");
  });

  it("is idempotent when the schema is already at target", async () => {
    const db = new InMemoryDb();
    await migrate(db as never);
    const second = await migrate(db as never);
    expect(second.applied).toHaveLength(0);
    expect(await getCurrentSchemaVersion(db as never)).toBe(2);
  });

  it("supports the {to} option to stop at an earlier version", async () => {
    const db = new InMemoryDb();
    const result = await migrate(db as never, { to: 1 });
    expect(result.to).toBe(1);
    expect(result.applied).toHaveLength(1);
  });
});

describe("clock + uuid composition", () => {
  it("produces deterministic timestamps and v4 ids", () => {
    clock.__setNow(() => new Date("2026-07-10T08:00:00.000Z"));
    expect(clock.nowIso()).toBe("2026-07-10T08:00:00.000Z");
    expect(uuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    clock.__reset();
  });
});
