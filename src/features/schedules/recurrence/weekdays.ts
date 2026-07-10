import type { Occurrence, Schedule } from "../types";
import { localDateIn, localToUtc, localWeekday } from "../timezone";
import { occurrenceKey } from "../occurrence-key";

/**
 * Selected-weekdays generator. The schedule's `weekdayMask` is a
 * 7-bit number (Mon=1, Tue=2, ..., Sun=64). We emit occurrences
 * only on days whose bit is set.
 */
export function* weekdaysOccurrences(
  schedule: Schedule,
  rangeFrom: Date,
  rangeTo: Date,
): Generator<Occurrence> {
  const fromLocal = localDateIn(rangeFrom, schedule.timezone);
  const toLocal = localDateIn(rangeTo, schedule.timezone);
  const start = schedule.startDate;
  const end = schedule.endDate;
  const effectiveStart = start > fromLocal ? start : fromLocal;
  const effectiveEnd =
    end !== null && end < toLocal ? end : toLocal;
  if (effectiveStart > effectiveEnd) return;

  let cursor = new Date(effectiveStart + "T12:00:00Z");
  const endDate = new Date(effectiveEnd + "T12:00:00Z");

  while (cursor.getTime() <= endDate.getTime()) {
    const localDate = localDateIn(cursor, schedule.timezone);
    const wd = localWeekday(cursor, schedule.timezone);
    const bit = 1 << wd;
    if ((schedule.weekdayMask & bit) !== 0) {
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
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
}
