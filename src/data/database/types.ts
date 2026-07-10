/**
 * PawPair — deterministic clock.
 *
 * docs/AAA-HANDOFF.md §14 requires that tests never depend on the real
 * current time. Production code uses `now()` everywhere, which by default
 * returns `new Date()`. Tests inject a fixed value via `setNow()`.
 *
 * Always pass a `Date` to repositories and schedule logic. Never use
 * `Date.now()` directly inside a feature.
 */

let current: () => Date = () => new Date();

export const clock = {
  /** Current instant. Returns a fresh Date in production, fixed value in tests. */
  now(): Date {
    return current();
  },

  /** Current instant as a UTC ISO 8601 string. */
  nowIso(): string {
    return current().toISOString();
  },

  /** Override the clock. Tests only. */
  __setNow(fn: () => Date): void {
    current = fn;
  },

  /** Reset to wall-clock time. Tests only. */
  __reset(): void {
    current = () => new Date();
  },
};
