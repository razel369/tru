import type { Occurrence, Schedule } from "../types";
import { localDateIn } from "../timezone";
import { occurrenceKey } from "../occurrence-key";

/**
 * Every-N-hours generator. The schedule has a single anchor time
 * (schedule.times[0]) and emits a dose every `everyN` hours from
 * that anchor. Each emission is its own occurrence; the local
 * date and time are computed in the schedule timezone.
 */
export function* everyNHoursOccurrences(
  schedule: Schedule,
  rangeFrom: Date,
  rangeTo: Date,
): Generator<Occurrence> {
  if (schedule.everyN === null || schedule.everyN <= 0) return;
  if (schedule.times.length === 0) return;

  const anchorTime = schedule.times[0];
  if (typeof anchorTime !== "undefined") {
    const timeParts = anchorTime.split(":").map((n) => Number(n));
    const hh = timeParts[0] ?? 0;
    const mm = timeParts[1] ?? 0;
    const startDate = new Date(schedule.startDate + "T00:00:00Z");
    const startUtc = new Date(
      Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate(),
        hh,
        mm,
      ),
    );

    const stepMs = schedule.everyN * 60 * 60 * 1000;
    let cursor = startUtc.getTime();
    while (cursor <= rangeTo.getTime()) {
      if (cursor >= rangeFrom.getTime()) {
        const utc = new Date(cursor);
        const localDate = localDateIn(utc, schedule.timezone);
        const localTime = anchorTime;
        yield {
          id: "",
          scheduleId: schedule.id,
          key: occurrenceKey(schedule.id, localDate, localTime),
          scheduledForUtc: utc.toISOString(),
          localDate,
          localTime,
          dose: null,
        };
      }
      cursor += stepMs;
    }
  }
}
