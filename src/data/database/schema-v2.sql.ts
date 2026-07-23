/**
 * Schema v2 bridges the current general pet-care experience to SQLite.
 *
 * The normalized v1 tables remain available for progressively richer queries,
 * while the complete PetCareState is committed atomically as one validated
 * snapshot. This prevents partial writes across pets, tasks, logs, and health
 * records during the migration away from AsyncStorage.
 */
export const SCHEMA_V2_SQL = `
CREATE TABLE care_state_snapshots (
  id                TEXT PRIMARY KEY CHECK (id = 'primary'),
  data_version      INTEGER NOT NULL,
  payload           TEXT NOT NULL,
  payload_checksum  TEXT NOT NULL,
  updated_at_utc    TEXT NOT NULL
);
`;
