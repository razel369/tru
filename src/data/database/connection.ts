import * as SQLite from "expo-sqlite";

/**
 * PawPair — SQLite connection manager.
 *
 * docs/AAA-HANDOFF.md §4 mandates that `expo-sqlite` is the durable
 * source of truth for the app. AsyncStorage is reserved for
 * lightweight preferences and onboarding flags.
 *
 * This module owns the single, lazily-opened database handle used by
 * every repository. The migrations runner (src/data/database/migrations)
 * bootstraps the schema on first call to `getDatabase()`.
 */

const DB_NAME = "pawpair.v1.db";

let cached: SQLite.SQLiteDatabase | null = null;
let openPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (cached) return cached;
  if (openPromise) return openPromise;
  const pending = (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    // Enable foreign keys on every new connection.
    await db.execAsync("PRAGMA foreign_keys = ON;");
    await db.execAsync("PRAGMA journal_mode = WAL;");
    cached = db;
    return db;
  })();
  openPromise = pending;
  try {
    return await pending;
  } finally {
    if (openPromise === pending) openPromise = null;
  }
}

export async function closeDatabase(): Promise<void> {
  const pending = openPromise;
  const database = cached ?? (pending ? await pending.catch(() => null) : null);
  cached = null;
  openPromise = null;
  if (database) await database.closeAsync();
}

/** Test-only — close and forget the cached connection. */
export function __resetDatabaseForTests(): void {
  cached = null;
  openPromise = null;
}
