/**
 * PawPair — schema v1.
 *
 * 15 tables as required by docs/AAA-HANDOFF.md §4 "Local data".
 * The SQL is exported as a single string so the migrations runner
 * can execute it in one transaction. Every subsequent schema
 * change MUST live in `migrations/NNNN_<name>.sql.ts` and bump
 * `SCHEMA_VERSION` (see ./migrations/index.ts).
 *
 * Conventions:
 * - All ids are UUID v4 strings (text primary key).
 * - All instants are stored as UTC ISO 8601 strings (text).
 * - Wall-clock schedule times are stored separately from generated
 *   instants; schedule timezone is on the schedule row.
 * - Corrections are append-only — dose_events rows are never
 *   mutated. A correction creates a new event with
 *   `correction_of_event_id` pointing at the previous one.
 * - The combination (scheduled_dose_id, terminal) is enforced by
 *   a partial unique index so the server and the client can both
 *   reject double-terminal-event.
 * - Every foreign key that points at a row the user "owns" uses
 *   ON DELETE CASCADE; meta tables (sync_outbox, sync_metadata)
 *   cascade to avoid orphaned operations.
 */

export const SCHEMA_VERSION = 1 as const;

export const SCHEMA_V1_SQL = `
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- 1. users — local identity (no auth fields yet; auth lands in stage 8)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id              TEXT PRIMARY KEY,
  display_name    TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('owner', 'caregiver', 'viewer')),
  created_at_utc  TEXT NOT NULL,
  archived_at_utc TEXT
);

-- ---------------------------------------------------------------------------
-- 2. households — top-level care group
-- ---------------------------------------------------------------------------
CREATE TABLE households (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  created_at_utc  TEXT NOT NULL,
  archived_at_utc TEXT
);

-- ---------------------------------------------------------------------------
-- 3. household_members — joins users to households
-- ---------------------------------------------------------------------------
CREATE TABLE household_members (
  id              TEXT PRIMARY KEY,
  household_id    TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('owner', 'caregiver', 'viewer')),
  joined_at_utc   TEXT NOT NULL,
  UNIQUE (household_id, user_id)
);
CREATE INDEX idx_household_members_user ON household_members (user_id);

-- ---------------------------------------------------------------------------
-- 4. pets — pet profiles belong to a household
-- ---------------------------------------------------------------------------
CREATE TABLE pets (
  id               TEXT PRIMARY KEY,
  household_id     TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  species          TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'other')),
  breed            TEXT,
  age_years        REAL,
  avatar_seed      TEXT NOT NULL,  -- 'milo' | 'luna' | custom portrait key
  accent_color     TEXT NOT NULL,  -- hex
  created_at_utc   TEXT NOT NULL,
  archived_at_utc  TEXT
);
CREATE INDEX idx_pets_household ON pets (household_id);

-- ---------------------------------------------------------------------------
-- 5. pet_photos — multiple photos per pet
-- ---------------------------------------------------------------------------
CREATE TABLE pet_photos (
  id            TEXT PRIMARY KEY,
  pet_id        TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  uri           TEXT NOT NULL,         -- local file:// or future remote URL
  source        TEXT NOT NULL CHECK (source IN ('camera', 'library', 'generated', 'stock')),
  is_primary    INTEGER NOT NULL DEFAULT 0,
  created_at_utc TEXT NOT NULL
);
CREATE INDEX idx_pet_photos_pet ON pet_photos (pet_id);

-- ---------------------------------------------------------------------------
-- 6. medications — medication definitions belong to a household
-- ---------------------------------------------------------------------------
CREATE TABLE medications (
  id               TEXT PRIMARY KEY,
  household_id     TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  form             TEXT NOT NULL CHECK (form IN ('tablet', 'capsule', 'liquid', 'drops', 'injection', 'topical')),
  dosage_text      TEXT NOT NULL,
  instructions     TEXT,
  color            TEXT NOT NULL,    -- hex accent
  discreet_label   TEXT,             -- optional neutral copy for discreet notifications
  created_at_utc   TEXT NOT NULL,
  archived_at_utc  TEXT
);
CREATE INDEX idx_medications_household ON medications (household_id);

-- ---------------------------------------------------------------------------
-- 7. medication_schedules — schedule kind + window
-- ---------------------------------------------------------------------------
CREATE TABLE medication_schedules (
  id                TEXT PRIMARY KEY,
  medication_id     TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK (type IN ('daily', 'weekdays', 'every_n_hours', 'every_n_days', 'weekly', 'monthly', 'date_range', 'taper', 'cycle', 'prn')),
  timezone          TEXT NOT NULL,   -- IANA, e.g. 'Asia/Jerusalem'
  start_date        TEXT NOT NULL,   -- ISO date 'YYYY-MM-DD' in schedule TZ
  end_date          TEXT,            -- nullable for open-ended
  paused_at_utc     TEXT,
  -- Cycle-specific (days on / days off) lives here so cycle rows are first-class.
  cycle_on_days     INTEGER,
  cycle_off_days    INTEGER,
  -- Every-N-everything needs a single integer.
  every_n           INTEGER,
  created_at_utc    TEXT NOT NULL
);
CREATE INDEX idx_medication_schedules_medication ON medication_schedules (medication_id);

-- ---------------------------------------------------------------------------
-- 8. schedule_times — wall-clock times for daily/weekday schedules
-- ---------------------------------------------------------------------------
CREATE TABLE schedule_times (
  id           TEXT PRIMARY KEY,
  schedule_id  TEXT NOT NULL REFERENCES medication_schedules(id) ON DELETE CASCADE,
  time         TEXT NOT NULL,        -- 'HH:MM' in schedule timezone
  weekday_mask INTEGER NOT NULL DEFAULT 127  -- bitmask Mon=1 ... Sun=64; 127 = all days
);
CREATE INDEX idx_schedule_times_schedule ON schedule_times (schedule_id);

-- ---------------------------------------------------------------------------
-- 9. scheduled_doses — deterministic occurrences
-- ---------------------------------------------------------------------------
CREATE TABLE scheduled_doses (
  id                TEXT PRIMARY KEY,
  schedule_id       TEXT NOT NULL REFERENCES medication_schedules(id) ON DELETE CASCADE,
  occurrence_key    TEXT NOT NULL,   -- deterministic hash of (schedule_id, local date+time, tz)
  scheduled_for_utc TEXT NOT NULL,   -- generated instant
  generated_at_utc  TEXT NOT NULL,
  UNIQUE (occurrence_key)
);
CREATE INDEX idx_scheduled_doses_schedule_for ON scheduled_doses (schedule_id, scheduled_for_utc);
CREATE INDEX idx_scheduled_doses_for ON scheduled_doses (scheduled_for_utc);

-- ---------------------------------------------------------------------------
-- 10. dose_events — append-only history with corrections
-- ---------------------------------------------------------------------------
CREATE TABLE dose_events (
  id                       TEXT PRIMARY KEY,
  scheduled_dose_id        TEXT NOT NULL REFERENCES scheduled_doses(id) ON DELETE CASCADE,
  status                   TEXT NOT NULL CHECK (status IN ('given', 'skipped')),
  completed_at_utc         TEXT NOT NULL,
  completed_by_user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  note                     TEXT,
  correction_of_event_id   TEXT REFERENCES dose_events(id) ON DELETE SET NULL
);
CREATE INDEX idx_dose_events_scheduled_dose ON dose_events (scheduled_dose_id);
CREATE INDEX idx_dose_events_completed ON dose_events (completed_at_utc);

-- Enforce one active terminal event per occurrence. We treat every
-- 'given' or 'skipped' event as terminal and treat a 'correction_of_event_id'
-- as superseding the prior row.
CREATE UNIQUE INDEX idx_dose_events_one_active_per_occurrence
  ON dose_events (scheduled_dose_id)
  WHERE correction_of_event_id IS NULL;

-- ---------------------------------------------------------------------------
-- 11. inventory_transactions — ledger (never edit a counter directly)
-- ---------------------------------------------------------------------------
CREATE TABLE inventory_transactions (
  id              TEXT PRIMARY KEY,
  medication_id   TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  delta           REAL NOT NULL,            -- signed units
  unit            TEXT NOT NULL,
  reason          TEXT NOT NULL CHECK (reason IN ('initial', 'dose_given', 'refill', 'correction', 'discard', 'spillage')),
  occurred_at_utc TEXT NOT NULL,
  note            TEXT
);
CREATE INDEX idx_inventory_transactions_medication ON inventory_transactions (medication_id, occurred_at_utc);

-- ---------------------------------------------------------------------------
-- 12. refill_reminders — inventory threshold rules
-- ---------------------------------------------------------------------------
CREATE TABLE refill_reminders (
  id                TEXT PRIMARY KEY,
  medication_id     TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  threshold_units   REAL NOT NULL,
  lead_days         INTEGER NOT NULL DEFAULT 7,
  last_alerted_at_utc TEXT
);
CREATE INDEX idx_refill_reminders_medication ON refill_reminders (medication_id);

-- ---------------------------------------------------------------------------
-- 13. notification_registrations — Expo notification scheduling
-- ---------------------------------------------------------------------------
CREATE TABLE notification_registrations (
  id                TEXT PRIMARY KEY,
  schedule_id       TEXT NOT NULL REFERENCES medication_schedules(id) ON DELETE CASCADE,
  scheduled_dose_id TEXT REFERENCES scheduled_doses(id) ON DELETE CASCADE,
  expo_push_token   TEXT,
  scheduled_for_utc TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('scheduled', 'delivered', 'cancelled', 'failed')),
  attempts          INTEGER NOT NULL DEFAULT 0,
  last_error        TEXT,
  created_at_utc    TEXT NOT NULL
);
CREATE INDEX idx_notification_registrations_schedule ON notification_registrations (schedule_id, scheduled_for_utc);
CREATE INDEX idx_notification_registrations_status ON notification_registrations (status);

-- ---------------------------------------------------------------------------
-- 14. sync_outbox — outbound mutations awaiting the server
-- ---------------------------------------------------------------------------
CREATE TABLE sync_outbox (
  id              TEXT PRIMARY KEY,
  entity          TEXT NOT NULL,           -- table name, e.g. 'dose_events'
  entity_id       TEXT NOT NULL,           -- id of the affected row
  op              TEXT NOT NULL CHECK (op IN ('insert', 'update', 'delete')),
  payload         TEXT NOT NULL,           -- JSON snapshot
  occurred_at_utc TEXT NOT NULL,
  attempt_count   INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  idempotency_key TEXT NOT NULL,           -- hash of (entity, entity_id, op, payload)
  UNIQUE (idempotency_key)
);
CREATE INDEX idx_sync_outbox_occurred ON sync_outbox (occurred_at_utc);

-- ---------------------------------------------------------------------------
-- 15. sync_metadata — per-table sync state (last cursors)
-- ---------------------------------------------------------------------------
CREATE TABLE sync_metadata (
  id                  TEXT PRIMARY KEY,
  table_name          TEXT NOT NULL UNIQUE,
  last_pulled_at_utc  TEXT,
  last_pushed_at_utc  TEXT,
  cursor              TEXT
);
`;
