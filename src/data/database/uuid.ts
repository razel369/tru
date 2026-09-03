/**
 * PawPair — UUID v4 generator.
 *
 * docs/AAA-HANDOFF.md §4 requires that identifiers are stored as UUIDs.
 * We use `crypto.randomUUID()` when available (modern Hermes) and fall
 * back to a Math.random-based v4 generator for older runtimes. The
 * implementation is RFC 4122 compliant.
 */

export function uuid(): string {
  const g: { randomUUID?: () => string } | undefined = globalThis.crypto;
  if (g?.randomUUID) {
    return g.randomUUID();
  }
  // RFC 4122 v4 fallback.
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  // `!` is safe: we just allocated 16 bytes.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  // NoUncheckedIndexedAccess forces us to assert non-empty.
  const [a = "", b = "", c = "", d = "", e = ""] = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ];
  return `${a}-${b}-${c}-${d}-${e}`;
}
