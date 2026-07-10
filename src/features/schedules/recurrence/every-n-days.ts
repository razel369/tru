import type { Occurrence, Schedule } from "../types";
import { localDateIn, localToUtc } from "../timezone";
import { occurrenceKey } from "../occurrence-key";

/**
 * Every-N-days generator. Walks in N-day strides from startDate.
 * If weekdayMask is set, we additionally restrict the stride to
 * land on matching weekdays; otherwise every stride day is on.
 */
export function* everyNDaysOccurrences(
  schedule: Schedule,
  rangeFrom: Date,
  rangeTo: Date,
): Generator<Occurrence> {
  if (schedule.everyN === null || schedule.everyN <= 0) return;
  if (schedule.times.length === 0) return;

  const startMs = new Date(schedule.startDate + "T12:00:00Z").getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const fromMs = rangeFrom.getTime();
  const toMs = rangeTo.getTime();
  const endDate = schedule.endDate;
  const endMs = endDate !== null ? new Date(endDate + "T12:00:00Z").getTime() : null;

  let cursorMs = startMs;
  while (cursorMs <= toMs) {
    if (endMs !== null && cursorMs > endMs) break;
    const day = new Date(cursorMs);
    const localDate = localDateIn(day, schedule.timezone);
    const wd = parseWeekdayShort(
      new Intl.DateTimeFormat("en-US", {
        timeZone: schedule.timezone,
        weekday: "short",
      }).format(day),
    );
    const bit = 1 << wd;
    if (schedule.weekdayMask === 0 || (schedule.weekdayMask & bit) !== 0) {
      if (cursorMs >= fromMs) {
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
    cursorMs += schedule.everyN * dayMs;
  }
}

function parseWeekdayShort(short: string): number {
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return map[short] ?? 0;
}
