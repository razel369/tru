import type { Occurrence, Schedule } from "../types";
import { localDateIn, localToUtc, localWeekday } from "../timezone";
import { occurrenceKey } from "../occurrence-key";

/**
 * Weekly-on-day generator. The schedule's weekdayMask must have
 * exactly one bit set; if more, the lowest set bit wins.
 */
export function* weeklyOccurrences(
  schedule: Schedule,
  rangeFrom: Date,
  rangeTo: Date,
): Generator<Occurrence> {
  if (schedule.times.length === 0) return;
  if (schedule.weekdayMask === 0) return;

  // Pick the first set bit (Mon = 0, Sun = 6).
  let target = 0;
  for (let i = 0; i < 7; i += 1) {
    if ((schedule.weekdayMask & (1 << i)) !== 0) {
      target = i;
      break;
    }
  }

  const startMs = new Date(schedule.startDate + "T12:00:00Z").getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const fromMs = rangeFrom.getTime();
  const toMs = rangeTo.getTime();
  const endDate = schedule.endDate;
  const endMs = endDate !== null ? new Date(endDate + "T12:00:00Z").getTime() : null;

  // Walk forward 7 days at a time from the start until we cross
  // the range, emitting the target weekday.
  for (let weekStart = startMs; weekStart <= toMs; weekStart += 7 * dayMs) {
    if (endMs !== null && weekStart > endMs) break;
    const dayMsAt = weekStart + target * dayMs;
    if (dayMsAt < fromMs) continue;
    if (dayMsAt > toMs) continue;
    const day = new Date(dayMsAt);
    // Sanity: the weekday should match the target. If DST caused
    // a shift we may need to recompute. The localWeekday helper
    // handles the timezone correctly.
    const wd = localWeekday(day, schedule.timezone);
    const localDate = localDateIn(day, schedule.timezone);
    if (wd !== target) {
      // Off-by-one in DST transition; skip rather than emit a
      // wrong weekday. Stage 5c will replace this with an
      // explicit DST-aware walker.
      continue;
    }
    for (const time of schedule.times) {
      const utc = localToUtc(localDate, time, schedule.timezone);
      yield {
        id: "",
        scheduleId: schedule.id,
        key: occurrenceKey(schedule.id, localDate, time),
        scheduledForUtc: utc.toISOString(),
        localDate,
        localTime: time,
        dose: null,
      };
    }
  }
}
