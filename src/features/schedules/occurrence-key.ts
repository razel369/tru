/**
 * PawPair — deterministic occurrence key.
 *
 * docs/AAA-HANDOFF.md §4: "A scheduled dose must have a deterministic
 * occurrence key." Two clients with the same schedule row, the
 * same local date, and the same local time must produce the same
 * key, even on different devices in different timezones.
 *
 * We use a small, non-cryptographic 32-bit FNV-1a hash encoded as
 * an 8-character hex string, prefixed by the schedule id and the
 * local date. The whole thing stays under 80 characters and fits
 * comfortably in the `scheduled_doses.occurrence_key` column.
 */

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function fnv1a(input: string): number {
  let hash = FNV_OFFSET;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  // Force unsigned.
  return hash >>> 0;
}

function toHex8(n: number): string {
  return n.toString(16).padStart(8, "0");
}

/**
 * Build the deterministic key for a single occurrence.
 *
 * Format: `{scheduleId}:{localDate}:{localTime}:{hash}` where
 * `hash` mixes scheduleId + localDate + localTime so two different
 * schedules that happen to share a date+time still get distinct
 * keys, and two clients with the same inputs always collide.
 */
export function occurrenceKey(
  scheduleId: string,
  localDate: string,
  localTime: string,
): string {
  const mixed = `${scheduleId}|${localDate}|${localTime}`;
  return `${scheduleId}:${localDate}:${localTime}:${toHex8(fnv1a(mixed))}`;
}

/** Inverse — useful for tests that want to assert the components. */
export interface OccurrenceKeyParts {
  scheduleId: string;
  localDate: string;
  localTime: string;
  hash: string;
}

export function parseOccurrenceKey(key: string): OccurrenceKeyParts | null {
  // The last segment is the hex hash, the first three are
  // scheduleId, localDate, localTime. localTime itself contains
  // a colon (HH:MM), so we cannot split naively.
  const hashStart = key.lastIndexOf(":");
  if (hashStart < 0) return null;
  const hash = key.slice(hashStart + 1);
  if (!/^[0-9a-f]{8}$/.test(hash)) return null;
  const head = key.slice(0, hashStart);
  // head is "{scheduleId}:{localDate}:{localTime}". localDate has
  // no colons; localTime has exactly one.
  const firstColon = head.indexOf(":");
  if (firstColon < 0) return null;
  const scheduleId = head.slice(0, firstColon);
  const rest = head.slice(firstColon + 1);
  const secondColon = rest.indexOf(":");
  if (secondColon < 0) return null;
  const localDate = rest.slice(0, secondColon);
  const localTime = rest.slice(secondColon + 1);
  return { scheduleId, localDate, localTime, hash };
}
