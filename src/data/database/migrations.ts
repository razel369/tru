import type { SQLiteDatabase } from "expo-sqlite";

import { SCHEMA_V1_SQL } from "./schema-v1.sql";

/**
 * PawPair — migrations runner.
 *
 * docs/AAA-HANDOFF.md §4 requires that every schema change ship as a
 * numbered migration and that "Never silently discard prototype data;
 * provide a v2 import path or an explicit development-only reset."
 *
 * The runner is intentionally simple:
 *   1. Read PRAGMA user_version (an integer we own).
 *   2. Apply every registered migration whose `version` is greater
 *      than the current version, in order.
 *   3. Bump user_version.
 *
 * We keep migrations in code (not .sql files) so the bundler can
 * tree-shake them and so reviewers see them in the same diff as the
 * TypeScript that depends on the new schema.
 *
 * NOTE: this module deliberately imports only types and the SQL
 * strings — no `expo-sqlite` runtime imports. Tests can import it
 * without dragging in react-native.
 */

export interface Migration {
  version: number;
  name: string;
  up: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "initial_schema",
    up: SCHEMA_V1_SQL,
  },
];

/**
 * The schema version that a fresh install will end up at after the
 * runner has applied all registered migrations. The migrations runner
 * itself uses `user_version`, but tests and the readme use this const
 * to know what to expect.
 */
export const TARGET_SCHEMA_VERSION = MIGRATIONS.reduce(
  (acc, m) => Math.max(acc, m.version),
  0,
);

const USER_VERSION_PRAGMA = "user_version";

export async function getCurrentSchemaVersion(
  db: SQLiteDatabase,
): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    `PRAGMA ${USER_VERSION_PRAGMA};`,
  );
  return row?.user_version ?? 0;
}

export interface MigrateOptions {
  /** Run only up to and including this version. */
  to?: number;
  /** Test-only: drop every known table before re-applying. */
  reset?: boolean;
}

export async function migrate(
  db: SQLiteDatabase,
  options: MigrateOptions = {},
): Promise<{ from: number; to: number; applied: Migration[] }> {
  await db.execAsync("PRAGMA foreign_keys = ON;");

  if (options.reset) {
    await resetDatabase(db);
  }

  const current = await getCurrentSchemaVersion(db);
  const target =
    options.to !== undefined
      ? Math.min(options.to, MIGRATIONS.length)
      : MIGRATIONS.length;
  const applied: Migration[] = [];

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    if (migration.version > target) break;
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.up);
      await db.execAsync(`PRAGMA ${USER_VERSION_PRAGMA} = ${migration.version};`);
    });
    applied.push(migration);
  }

  const finalVersion = await getCurrentSchemaVersion(db);
  return { from: current, to: finalVersion, applied };
}

/** Test-only — drops every application table so a fresh test run starts clean. */
async function resetDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA foreign_keys = OFF;");
  const tables = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';",
  );
  for (const { name } of tables) {
    await db.execAsync(`DROP TABLE IF EXISTS "${name}";`);
  }
  await db.execAsync(`PRAGMA ${USER_VERSION_PRAGMA} = 0;`);
  await db.execAsync("PRAGMA foreign_keys = ON;");
}
