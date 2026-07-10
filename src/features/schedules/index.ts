/**
 * PawPair — schedule engine.
 *
 * docs/AAA-HANDOFF.md §6 requires deterministic, property-testable
 * recurrence generation. UI code must never calculate recurrence
 * itself. This module is the only place that emits occurrences.
 *
 * Conventions:
 * - All times cross the timezone boundary via localToUtc.
 * - Occurrence keys are stable for the same (scheduleId, localDate,
 *   localTime) regardless of the device or timezone offset.
 * - The engine never throws on bad input; invalid schedules yield
 *   no occurrences and are surfaced by validation separately.
 */

import { cycleOccurrences } from "./recurrence/cycle";
import { dailyOccurrences } from "./recurrence/daily";
import { everyNHoursOccurrences } from "./recurrence/every-n-hours";
import { weekdaysOccurrences } from "./recurrence/weekdays";
import type { Occurrence, Schedule } from "./types";

export function generateOccurrences(
  schedule: Schedule,
  rangeFrom: Date,
  rangeTo: Date,
): Occurrence[] {
  if (schedule.paused) return [];
  if (rangeFrom.getTime() > rangeTo.getTime()) return [];
  const out: Occurrence[] = [];
  let iter: Generator<Occurrence>;
  switch (schedule.type) {
    case "daily":
      iter = dailyOccurrences(schedule, rangeFrom, rangeTo);
      break;
    case "weekdays":
      iter = weekdaysOccurrences(schedule, rangeFrom, rangeTo);
      break;
    case "every_n_hours":
      iter = everyNHoursOccurrences(schedule, rangeFrom, rangeTo);
      break;
    case "cycle":
      iter = cycleOccurrences(schedule, rangeFrom, rangeTo);
      break;
    case "every_n_days":
    case "weekly":
    case "monthly":
    case "date_range":
    case "taper":
    case "prn":
      // Reserved for follow-up stages. Returning an empty list
      // is the contract: the UI shows the user the existing v1
      // schedule until the new kinds land.
      return [];
  }
  for (const occ of iter) {
    out.push(occ);
  }
  return out;
}

export type { Occurrence, Schedule, ScheduleType, TaperPhase } from "./types";
export { scheduleTypeLabel, EVERY_DAY } from "./types";
export { occurrenceKey, parseOccurrenceKey } from "./occurrence-key";
export {
  localDateIn,
  localTimeIn,
  localWeekday,
  localToUtc,
  isValidTimezone,
  validateLocalDate,
  validateLocalTime,
} from "./timezone";
