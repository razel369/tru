import { clock } from "../../data/database/types";
import { uuid } from "../../data/database/uuid";
import type {
  SyncEntity,
  SyncOp,
  SyncOutboxEntry,
} from "./types";

/**
 * PawPair — sync outbox.
 *
 * docs/AAA-HANDOFF.md §5: "A dose action writes locally
 * immediately. It enters an idempotent sync outbox. The server
 * accepts the event only against the expected occurrence
 * version. A unique constraint prevents duplicate terminal
 * events for the same occurrence."
 *
 * The client-side outbox queues mutations and exposes a
 * drain loop. The server is responsible for idempotency; the
 * client guarantees it by including a stable hash of the
 * payload in `idempotencyKey`.
 *
 * Stage 8 ships the in-memory queue. Stage 8-final wires the
 * drain loop to a real Supabase function.
 */

let queue: SyncOutboxEntry[] = [];

export function __resetOutboxForTests(): void {
  queue = [];
}

function hashPayload(
  entity: SyncEntity,
  entityId: string,
  op: SyncOp,
  payload: string,
): string {
  // Stable, fast, non-cryptographic. The server uses the same
  // hash to deduplicate retries.
  const input = `${entity}|${entityId}|${op}|${payload}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function enqueue(input: {
  entity: SyncEntity;
  entityId: string;
  op: SyncOp;
  payload: unknown;
}): SyncOutboxEntry {
  const payloadStr =
    typeof input.payload === "string"
      ? input.payload
      : JSON.stringify(input.payload);
  const idempotencyKey = hashPayload(
    input.entity,
    input.entityId,
    input.op,
    payloadStr,
  );
  // Coalesce: if a prior entry with the same idempotency key
  // exists, do not enqueue a duplicate.
  if (queue.some((e) => e.idempotencyKey === idempotencyKey)) {
    return queue.find((e) => e.idempotencyKey === idempotencyKey)!;
  }
  const entry: SyncOutboxEntry = {
    id: `o-${uuid()}`,
    entity: input.entity,
    entityId: input.entityId,
    op: input.op,
    payload: payloadStr,
    createdAtUtc: clock.nowIso(),
    attemptCount: 0,
    lastError: null,
    idempotencyKey,
  };
  queue = [...queue, entry];
  return entry;
}

export function pending(): SyncOutboxEntry[] {
  return queue.filter((e) => e.lastError === null);
}

export function failed(): SyncOutboxEntry[] {
  return queue.filter((e) => e.lastError !== null);
}

export function markSynced(id: string): void {
  queue = queue.filter((e) => e.id !== id);
}

export function markFailure(id: string, error: string): void {
  queue = queue.map((e) =>
    e.id === id
      ? { ...e, lastError: error, attemptCount: e.attemptCount + 1 }
      : e,
  );
}

export type DrainResult = {
  synced: string[];
  failures: { id: string; error: string }[];
};

/**
 * Drain the queue by calling the provided sender. The default
 * sender is a no-op so tests can use a stub.
 */
export type Sender = (entry: SyncOutboxEntry) => Promise<void>;

let sender: Sender = async () => undefined;

export function __setSender(next: Sender): void {
  sender = next;
}

export async function drain(maxAttempts = 3): Promise<DrainResult> {
  const synced: string[] = [];
  const failures: { id: string; error: string }[] = [];
  for (const entry of queue) {
    if (entry.attemptCount >= maxAttempts) {
      failures.push({ id: entry.id, error: entry.lastError ?? "max attempts" });
      continue;
    }
    try {
      await sender(entry);
      markSynced(entry.id);
      synced.push(entry.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      markFailure(entry.id, message);
      failures.push({ id: entry.id, error: message });
    }
  }
  return { synced, failures };
}
