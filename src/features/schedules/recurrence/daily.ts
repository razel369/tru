import type { Occurrence, Schedule } from "../types";
import { localDateIn, localToUtc } from "../timezone";
import { occurrenceKey } from "../occurrence-key";

/**
 * Daily-at-times generator. The simplest of the recurrence rules.
 *
 * For each calendar day in [startDate, endDate] (or open-ended),
 * emit one occurrence per time in `schedule.times`. Paused and
 * end-dated schedules are filtered out by the caller.
 */
export function* dailyOccurrences(
  schedule: Schedule,
  rangeFrom: Date,
  rangeTo: Date,
): Generator<Occurrence> {
  const fromLocal = localDateIn(rangeFrom, schedule.timezone);
  const toLocal = localDateIn(rangeTo, schedule.timezone);
  const start = schedule.startDate;
  const end = schedule.endDate;

  // Effective start is the later of schedule.startDate and fromLocal.
  const effectiveStart = start > fromLocal ? start : fromLocal;
  // Effective end is the earlier of schedule.endDate and toLocal.
  const effectiveEnd =
    end !== null && end < toLocal ? end : toLocal;

  if (effectiveStart > effectiveEnd) return;

  // Iterate one calendar day at a time. The cursor encodes a local
  // calendar date at UTC noon, so its ISO date is the intended local
  // date regardless of DST. Avoid projecting it through the schedule
  // timezone again for every occurrence.
  let cursor = new Date(effectiveStart + "T12:00:00Z");
  const endDate = new Date(effectiveEnd + "T12:00:00Z");

  while (cursor.getTime() <= endDate.getTime()) {
    const localDate = cursor.toISOString().slice(0, 10);
    for (const time of schedule.times) {
      const utc = localToUtc(localDate, time, schedule.timezone);
      yield {
        id: "", // assigned by the persistence layer
        scheduleId: schedule.id,
        key: occurrenceKey(schedule.id, localDate, time),
        scheduledForUtc: utc.toISOString(),
        localDate,
        localTime: time,
        dose: null,
      };
    }
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
}
