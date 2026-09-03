import type { SQLiteDatabase } from "expo-sqlite";

import { clock } from "../database/types";
import { uuid } from "../database/uuid";

export type MedicationForm = "tablet" | "capsule" | "liquid" | "drops" | "injection" | "topical";

export interface MedicationRow {
  id: string;
  household_id: string;
  name: string;
  form: MedicationForm;
  dosage_text: string;
  instructions: string | null;
  color: string;
  discreet_label: string | null;
  created_at_utc: string;
  archived_at_utc: string | null;
}

export interface NewMedicationInput {
  householdId: string;
  name: string;
  form: MedicationForm;
  dosageText: string;
  instructions?: string | null;
  color: string;
  discreetLabel?: string | null;
}

export class MedicationsRepository {
  constructor(private db: SQLiteDatabase) {}

  async listForHousehold(householdId: string): Promise<MedicationRow[]> {
    return this.db.getAllAsync<MedicationRow>(
      `SELECT * FROM medications
       WHERE household_id = ? AND archived_at_utc IS NULL
       ORDER BY created_at_utc ASC;`,
      householdId,
    );
  }

  async findById(id: string): Promise<MedicationRow | null> {
    return this.db.getFirstAsync<MedicationRow>(
      `SELECT * FROM medications WHERE id = ?;`,
      id,
    );
  }

  async create(input: NewMedicationInput): Promise<MedicationRow> {
    const row: MedicationRow = {
      id: uuid(),
      household_id: input.householdId,
      name: input.name,
      form: input.form,
      dosage_text: input.dosageText,
      instructions: input.instructions ?? null,
      color: input.color,
      discreet_label: input.discreetLabel ?? null,
      created_at_utc: clock.nowIso(),
      archived_at_utc: null,
    };
    await this.db.runAsync(
      `INSERT INTO medications (
        id, household_id, name, form, dosage_text, instructions,
        color, discreet_label, created_at_utc, archived_at_utc
      ) VALUES (?,?,?,?,?,?,?,?,?,?);`,
      row.id,
      row.household_id,
      row.name,
      row.form,
      row.dosage_text,
      row.instructions,
      row.color,
      row.discreet_label,
      row.created_at_utc,
      row.archived_at_utc,
    );
    return row;
  }

  async archive(id: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE medications SET archived_at_utc = ? WHERE id = ?;`,
      clock.nowIso(),
      id,
    );
  }
}
