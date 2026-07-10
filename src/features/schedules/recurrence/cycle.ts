import type { Occurrence, Schedule } from "../types";
import { localDateIn, localToUtc } from "../timezone";
import { occurrenceKey } from "../occurrence-key";

/**
 * Cycle (days-on / days-off) generator.
 *
 * Starting from `schedule.startDate`, the cycle alternates between
 * `cycleOnDays` "on" days and `cycleOffDays` "off" days. Doses are
 * only emitted on the on-days. The default times of the schedule
 * apply on every on-day.
 */
export function* cycleOccurrences(
  schedule: Schedule,
  rangeFrom: Date,
  rangeTo: Date,
): Generator<Occurrence> {
  const onDays = schedule.cycleOnDays ?? 0;
  const offDays = schedule.cycleOffDays ?? 0;
  if (onDays <= 0) return;
  if (schedule.times.length === 0) return;

  const cycleLen = onDays + offDays;
  const startMs = new Date(schedule.startDate + "T12:00:00Z").getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const fromMs = rangeFrom.getTime();
  const toMs = rangeTo.getTime();
  const endDate = schedule.endDate;

  // Walk one cycle at a time and emit doses inside the on-window.
  for (let cycleStart = startMs; cycleStart <= toMs; cycleStart += cycleLen * dayMs) {
    const onStart = cycleStart;
    const onEnd = cycleStart + onDays * dayMs;
    if (onEnd < fromMs) continue;
    if (endDate !== null) {
      const endMs = new Date(endDate + "T12:00:00Z").getTime();
      if (cycleStart > endMs) break;
    }
    for (let off = 0; off < onDays; off += 1) {
      const dayMsAt = onStart + off * dayMs;
      const day = new Date(dayMsAt);
      const localDate = localDateIn(day, schedule.timezone);
      if (dayMsAt + dayMs < fromMs) continue;
      if (dayMsAt > toMs) continue;
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
}
