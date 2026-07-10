import type { SQLiteDatabase } from "expo-sqlite";

import { clock } from "../database/types";
import { uuid } from "../database/uuid";

export type DoseEventStatus = "given" | "skipped";

export interface DoseEventRow {
  id: string;
  scheduled_dose_id: string;
  status: DoseEventStatus;
  completed_at_utc: string;
  completed_by_user_id: string | null;
  note: string | null;
  correction_of_event_id: string | null;
}

export interface NewDoseEventInput {
  scheduledDoseId: string;
  status: DoseEventStatus;
  completedByUserId?: string | null;
  note?: string | null;
  correctionOfEventId?: string | null;
}

export class DoseEventsRepository {
  constructor(private db: SQLiteDatabase) {}

  async listForScheduledDose(
    scheduledDoseId: string,
  ): Promise<DoseEventRow[]> {
    return this.db.getAllAsync<DoseEventRow>(
      `SELECT * FROM dose_events
       WHERE scheduled_dose_id = ?
       ORDER BY completed_at_utc ASC;`,
      scheduledDoseId,
    );
  }

  async findActiveForScheduledDose(
    scheduledDoseId: string,
  ): Promise<DoseEventRow | null> {
    return this.db.getFirstAsync<DoseEventRow>(
      `SELECT * FROM dose_events
       WHERE scheduled_dose_id = ? AND correction_of_event_id IS NULL
       ORDER BY completed_at_utc DESC LIMIT 1;`,
      scheduledDoseId,
    );
  }

  /**
   * Append a new terminal event. Throws if a non-superseded event
   * already exists for the same scheduled dose — the partial unique
   * index on the table will reject the second insert.
   */
  async create(input: NewDoseEventInput): Promise<DoseEventRow> {
    const row: DoseEventRow = {
      id: uuid(),
      scheduled_dose_id: input.scheduledDoseId,
      status: input.status,
      completed_at_utc: clock.nowIso(),
      completed_by_user_id: input.completedByUserId ?? null,
      note: input.note ?? null,
      correction_of_event_id: input.correctionOfEventId ?? null,
    };
    await this.db.runAsync(
      `INSERT INTO dose_events (
        id, scheduled_dose_id, status, completed_at_utc,
        completed_by_user_id, note, correction_of_event_id
      ) VALUES (?,?,?,?,?,?,?);`,
      row.id,
      row.scheduled_dose_id,
      row.status,
      row.completed_at_utc,
      row.completed_by_user_id,
      row.note,
      row.correction_of_event_id,
    );
    return row;
  }

  /**
   * Create a correction that supersedes a prior event. The prior row
   * is left untouched; a new row is added with
   * `correction_of_event_id` pointing at the original. Because the
   * unique index ignores rows that have a non-null
   * `correction_of_event_id`, the new row is allowed.
   */
  async correct(
    priorEventId: string,
    input: Omit<NewDoseEventInput, "correctionOfEventId">,
  ): Promise<DoseEventRow> {
    return this.create({ ...input, correctionOfEventId: priorEventId });
  }
}
