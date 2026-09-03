import type { Occurrence, Schedule } from "../types";

/**
 * PRN (as-needed) generator. PRN doses are not generated on a
 * calendar schedule — the caregiver logs them on demand. The
 * `prnMinIntervalMinutes` value is enforced by the
 * DoseEventsRepository: a new terminal event is rejected if it
 * would land closer to the previous one than the minimum.
 *
 * This generator therefore returns an empty list. The schedule
 * exists so the UI knows to show the "Log a dose" action and the
 * minimum-interval warning. The minimum interval itself is
 * stored on the schedule row and consulted by the dose log
 * endpoint.
 */
export function* prnOccurrences(
  _schedule: Schedule,
  _rangeFrom: Date,
  _rangeTo: Date,
): Generator<Occurrence> {
  return;
}
