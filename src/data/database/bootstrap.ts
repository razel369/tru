import { getDatabase } from "./connection";
import { migrate } from "./migrations";

/**
 * Production entry point — opens the database and applies pending
 * migrations. Call this once at app boot, before any repository
 * reads or writes.
 */
export async function ensureMigrated(): Promise<void> {
  const db = await getDatabase();
  await migrate(db);
}
