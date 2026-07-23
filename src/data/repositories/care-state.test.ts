import { beforeEach, describe, expect, it } from "vitest";

import { clock } from "../database/types";
import {
  CareStateCorruptionError,
  CareStateRepository,
  checksumCareStatePayload,
} from "./care-state";

type SnapshotRow = {
  data_version: number;
  id: string;
  payload: string;
  payload_checksum: string;
  updated_at_utc: string;
};

class SnapshotDb {
  row: SnapshotRow | null = null;

  async withTransactionAsync(task: () => Promise<void>) {
    await task();
  }

  getFirstAsync<T>() {
    return Promise.resolve(this.row as T | null);
  }

  runAsync(sql: string, ...params: unknown[]) {
    if (/^\s*INSERT/i.test(sql)) {
      this.row = {
        id: params[0] as string,
        data_version: params[1] as number,
        payload: params[2] as string,
        payload_checksum: params[3] as string,
        updated_at_utc: params[4] as string,
      };
    } else if (/^\s*DELETE/i.test(sql)) {
      this.row = null;
    }
    return Promise.resolve({ changes: 1, lastInsertRowId: 0 });
  }
}

describe("CareStateRepository", () => {
  beforeEach(() => {
    clock.__setNow(() => new Date("2026-07-16T08:00:00.000Z"));
  });

  it("saves and loads one atomic state snapshot", async () => {
    const db = new SnapshotDb();
    const repository = new CareStateRepository(db as never);
    await repository.save(1, '{"version":1,"pets":[]}');
    await expect(repository.load()).resolves.toEqual({
      dataVersion: 1,
      payload: '{"version":1,"pets":[]}',
      updatedAt: "2026-07-16T08:00:00.000Z",
    });
  });

  it("overwrites the primary snapshot instead of appending stale states", async () => {
    const db = new SnapshotDb();
    const repository = new CareStateRepository(db as never);
    await repository.save(1, "first");
    await repository.save(1, "second");
    expect((await repository.load())?.payload).toBe("second");
  });

  it("rejects a snapshot whose payload no longer matches its checksum", async () => {
    const db = new SnapshotDb();
    db.row = {
      data_version: 1,
      id: "primary",
      payload: "damaged",
      payload_checksum: checksumCareStatePayload("original"),
      updated_at_utc: "2026-07-16T08:00:00.000Z",
    };
    const repository = new CareStateRepository(db as never);
    await expect(repository.load()).rejects.toBeInstanceOf(
      CareStateCorruptionError,
    );
  });

  it("clears the snapshot explicitly", async () => {
    const db = new SnapshotDb();
    const repository = new CareStateRepository(db as never);
    await repository.save(1, "state");
    await repository.clear();
    await expect(repository.load()).resolves.toBeNull();
  });
});
