import type { SQLiteDatabase } from "expo-sqlite";

import { clock } from "../database/types";

const SNAPSHOT_ID = "primary";
const MAX_PAYLOAD_BYTES = 12 * 1024 * 1024;

export type CareStateSnapshot = {
  dataVersion: number;
  payload: string;
  updatedAt: string;
};

type CareStateSnapshotRow = {
  data_version: number;
  id: string;
  payload: string;
  payload_checksum: string;
  updated_at_utc: string;
};

export class CareStateCorruptionError extends Error {
  constructor() {
    super("The local PawPair database failed its integrity check.");
    this.name = "CareStateCorruptionError";
  }
}

export function checksumCareStatePayload(payload: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${payload.length}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export class CareStateRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async load(): Promise<CareStateSnapshot | null> {
    const row = await this.db.getFirstAsync<CareStateSnapshotRow>(
      `SELECT id, data_version, payload, payload_checksum, updated_at_utc
       FROM care_state_snapshots WHERE id = ? LIMIT 1;`,
      SNAPSHOT_ID,
    );
    if (!row) return null;
    if (checksumCareStatePayload(row.payload) !== row.payload_checksum) {
      throw new CareStateCorruptionError();
    }
    return {
      dataVersion: row.data_version,
      payload: row.payload,
      updatedAt: row.updated_at_utc,
    };
  }

  async save(dataVersion: number, payload: string): Promise<CareStateSnapshot> {
    if (new TextEncoder().encode(payload).byteLength > MAX_PAYLOAD_BYTES) {
      throw new Error("The local PawPair care database exceeds 12 MB.");
    }
    const snapshot = {
      dataVersion,
      payload,
      updatedAt: clock.nowIso(),
    };
    const checksum = checksumCareStatePayload(payload);
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        `INSERT INTO care_state_snapshots (
          id, data_version, payload, payload_checksum, updated_at_utc
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          data_version = excluded.data_version,
          payload = excluded.payload,
          payload_checksum = excluded.payload_checksum,
          updated_at_utc = excluded.updated_at_utc;`,
        SNAPSHOT_ID,
        dataVersion,
        payload,
        checksum,
        snapshot.updatedAt,
      );
    });
    return snapshot;
  }

  async clear(): Promise<void> {
    await this.db.runAsync(
      "DELETE FROM care_state_snapshots WHERE id = ?;",
      SNAPSHOT_ID,
    );
  }
}
