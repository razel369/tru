import type { Occurrence, Schedule } from "../types";
import { localDateIn, localToUtc } from "../timezone";
import { occurrenceKey } from "../occurrence-key";

/**
 * Date-range generator. Emits the schedule's `times` on every day
 * in [startDate, endDate] (inclusive). The endDate on the schedule
 * is the hard stop.
 */
export function* dateRangeOccurrences(
  schedule: Schedule,
  rangeFrom: Date,
  rangeTo: Date,
): Generator<Occurrence> {
  if (schedule.times.length === 0) return;
  if (schedule.endDate === null) return;

  const start = schedule.startDate;
  const end = schedule.endDate;
  if (start > end) return;

  let cursor = new Date(start + "T12:00:00Z");
  const endMs = new Date(end + "T12:00:00Z").getTime();
  while (cursor.getTime() <= endMs) {
    const localDate = localDateIn(cursor, schedule.timezone);
    if (localDate < localDateIn(rangeFrom, schedule.timezone)) {
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
      continue;
    }
    if (localDate > localDateIn(rangeTo, schedule.timezone)) break;
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
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
}
