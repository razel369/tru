import type { SQLiteDatabase } from "expo-sqlite";

import { clock } from "../database/types";
import { uuid } from "../database/uuid";

/**
 * Pet row in its SQLite form. The runtime `Pet` (src/types.ts) is the
 * view used by screens; this row is the storage shape. The two are
 * intentionally similar in v1 — once the schedule engine lands in
 * stage 5, the runtime shape will diverge (pets no longer carry
 * medications; medications are joined in).
 */
export interface PetRow {
  id: string;
  household_id: string;
  name: string;
  species: "dog" | "cat" | "other";
  breed: string | null;
  age_years: number | null;
  avatar_seed: string;
  accent_color: string;
  created_at_utc: string;
  archived_at_utc: string | null;
}

export interface NewPetInput {
  householdId: string;
  name: string;
  species: PetRow["species"];
  breed?: string | null;
  ageYears?: number | null;
  avatarSeed: string;
  accentColor: string;
}

export class PetsRepository {
  constructor(private db: SQLiteDatabase) {}

  async listForHousehold(householdId: string): Promise<PetRow[]> {
    return this.db.getAllAsync<PetRow>(
      `SELECT * FROM pets
       WHERE household_id = ? AND archived_at_utc IS NULL
       ORDER BY created_at_utc ASC;`,
      householdId,
    );
  }

  async findById(id: string): Promise<PetRow | null> {
    return this.db.getFirstAsync<PetRow>(
      `SELECT * FROM pets WHERE id = ?;`,
      id,
    );
  }

  async create(input: NewPetInput): Promise<PetRow> {
    const row: PetRow = {
      id: uuid(),
      household_id: input.householdId,
      name: input.name,
      species: input.species,
      breed: input.breed ?? null,
      age_years: input.ageYears ?? null,
      avatar_seed: input.avatarSeed,
      accent_color: input.accentColor,
      created_at_utc: clock.nowIso(),
      archived_at_utc: null,
    };
    await this.db.runAsync(
      `INSERT INTO pets (
        id, household_id, name, species, breed, age_years,
        avatar_seed, accent_color, created_at_utc, archived_at_utc
      ) VALUES (?,?,?,?,?,?,?,?,?,?);`,
      row.id,
      row.household_id,
      row.name,
      row.species,
      row.breed,
      row.age_years,
      row.avatar_seed,
      row.accent_color,
      row.created_at_utc,
      row.archived_at_utc,
    );
    return row;
  }

  async archive(id: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE pets SET archived_at_utc = ? WHERE id = ?;`,
      clock.nowIso(),
      id,
    );
  }
}
