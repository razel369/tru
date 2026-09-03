import type { Occurrence, Schedule, TaperPhase } from "../types";
import { localDateIn, localToUtc } from "../timezone";
import { occurrenceKey } from "../occurrence-key";

/**
 * Taper generator. A taper schedule is a list of phases. Each
 * phase starts at `startDay` (0-based) and runs until the next
 * phase's startDay or the end of the schedule. Each phase has
 * its own times and dose text. Stage 5c will align phase starts
 * to weekdays of the original prescription; for now we anchor
 * to the schedule's startDate and use day counts.
 */
export function* taperOccurrences(
  schedule: Schedule,
  rangeFrom: Date,
  rangeTo: Date,
): Generator<Occurrence> {
  if (schedule.taperPhases.length === 0) return;
  const startMs = new Date(schedule.startDate + "T12:00:00Z").getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const fromMs = rangeFrom.getTime();
  const toMs = rangeTo.getTime();
  const endDate = schedule.endDate;
  const scheduleEndMs = endDate !== null
    ? new Date(endDate + "T12:00:00Z").getTime()
    : Number.POSITIVE_INFINITY;

  const sorted = [...schedule.taperPhases].sort((a, b) => a.startDay - b.startDay);
  for (let i = 0; i < sorted.length; i += 1) {
    const phase = sorted[i];
    if (!phase) continue;
    const next = sorted[i + 1];
    const phaseStartMs = startMs + phase.startDay * dayMs;
    const phaseEndMs = next !== undefined
      ? startMs + next.startDay * dayMs
      : Math.min(scheduleEndMs, startMs + 365 * dayMs); // hard cap one year
    if (phaseEndMs < fromMs) continue;
    if (phaseStartMs > toMs) break;

    let cursorMs = Math.max(phaseStartMs, fromMs);
    while (cursorMs < phaseEndMs && cursorMs <= toMs) {
      const day = new Date(cursorMs);
      const localDate = localDateIn(day, schedule.timezone);
      for (const time of phase.times) {
        const utc = localToUtc(localDate, time, schedule.timezone);
        yield {
          id: "",
          scheduleId: schedule.id,
          key: occurrenceKey(schedule.id, localDate, time),
          scheduledForUtc: utc.toISOString(),
          localDate,
          localTime: time,
          dose: phase.dose,
        };
      }
      cursorMs += dayMs;
    }
  }
}

/**
 * Helper for callers: validate that a taper schedule is well
 * formed (phases are non-overlapping, startDays strictly
 * increasing, each phase has at least one time).
 */
export function isValidTaper(phases: TaperPhase[]): boolean {
  if (phases.length === 0) return true;
  for (let i = 0; i < phases.length; i += 1) {
    const phase = phases[i];
    if (!phase) return false;
    if (phase.times.length === 0) return false;
    if (phase.startDay < 0) return false;
    if (i > 0) {
      const prev = phases[i - 1];
      if (prev && phase.startDay <= prev.startDay) return false;
    }
  }
  return true;
}
