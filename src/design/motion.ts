/**
 * PawPair — motion tokens.
 *
 * Spring-based 180–320 ms transitions per docs/AAA-HANDOFF.md §3 rule 6.
 * The original prototype does not yet use Reanimated; the durations are
 * defined here so future motion work reads from a single source.
 */

export const duration = {
  fast: 180,
  base: 240,
  slow: 320,
} as const;

export type DurationToken = keyof typeof duration;
