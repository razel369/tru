import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  __resetOutboxForTests,
  __setSender,
  drain,
  enqueue,
  failed,
  markFailure,
  markSynced,
  pending,
} from "./sync-outbox";

describe("sync outbox", () => {
  beforeEach(() => {
    __resetOutboxForTests();
  });
  afterEach(() => {
    __resetOutboxForTests();
  });

  it("enqueues a new entry with a stable idempotency key", () => {
    const a = enqueue({
      entity: "dose_events",
      entityId: "sd-1",
      op: "insert",
      payload: { status: "given" },
    });
    expect(a.idempotencyKey).toMatch(/^[0-9a-f]{8}$/);
  });

  it("coalesces duplicate enqueues", () => {
    const a = enqueue({
      entity: "dose_events",
      entityId: "sd-1",
      op: "insert",
      payload: { status: "given" },
    });
    const b = enqueue({
      entity: "dose_events",
      entityId: "sd-1",
      op: "insert",
      payload: { status: "given" },
    });
    expect(b.id).toBe(a.id);
  });

  it("marks an entry synced and removes it from the queue", () => {
    const a = enqueue({
      entity: "dose_events",
      entityId: "sd-1",
      op: "insert",
      payload: { status: "given" },
    });
    markSynced(a.id);
    expect(pending()).toEqual([]);
  });

  it("marks failures and surfaces them separately", () => {
    const a = enqueue({
      entity: "dose_events",
      entityId: "sd-2",
      op: "insert",
      payload: { status: "skipped" },
    });
    markFailure(a.id, "network");
    expect(failed()).toHaveLength(1);
    expect(failed()[0]?.lastError).toBe("network");
  });

  it("drain() with a stub sender marks every pending entry synced", async () => {
    enqueue({
      entity: "dose_events",
      entityId: "sd-1",
      op: "insert",
      payload: { status: "given" },
    });
    enqueue({
      entity: "dose_events",
      entityId: "sd-2",
      op: "insert",
      payload: { status: "skipped" },
    });
    let calls = 0;
    __setSender(async () => {
      calls += 1;
    });
    const result = await drain();
    expect(result.synced).toHaveLength(2);
    expect(result.failures).toEqual([]);
    expect(calls).toBe(2);
    expect(pending()).toEqual([]);
  });

  it("drain() records per-entry failures when the sender throws", async () => {
    const a = enqueue({
      entity: "dose_events",
      entityId: "sd-1",
      op: "insert",
      payload: { status: "given" },
    });
    const b = enqueue({
      entity: "dose_events",
      entityId: "sd-2",
      op: "insert",
      payload: { status: "skipped" },
    });
    __setSender(async (entry) => {
      if (entry.entityId === "sd-1") {
        throw new Error("offline");
      }
    });
    const result = await drain();
    expect(result.synced).toEqual([b.id]);
    expect(result.failures).toEqual([{ id: a.id, error: "offline" }]);
  });
});
