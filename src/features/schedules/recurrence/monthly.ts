import type { Occurrence, Schedule } from "../types";
import { localDateIn, localToUtc } from "../timezone";
import { occurrenceKey } from "../occurrence-key";

/**
 * Monthly-on-day generator. The schedule's `everyN` is the day of
 * the month; `times` carry the wall-clock. Leap day (Feb 29) is
 * skipped in non-leap years.
 */
export function* monthlyOccurrences(
  schedule: Schedule,
  rangeFrom: Date,
  rangeTo: Date,
): Generator<Occurrence> {
  if (schedule.times.length === 0) return;
  if (schedule.everyN === null || schedule.everyN <= 0) return;
  const day = schedule.everyN;
  if (day < 1 || day > 31) return;

  const startYmd = schedule.startDate.split("-").map((n) => Number(n));
  const startYear = startYmd[0] ?? 2026;
  const fromYmd = localDateIn(rangeFrom, schedule.timezone).split("-").map((n) => Number(n));
  const toYmd = localDateIn(rangeTo, schedule.timezone).split("-").map((n) => Number(n));
  const fromYear = fromYmd[0] ?? startYear;
  const toYear = toYmd[0] ?? fromYear;
  const endDate = schedule.endDate;
  const rangeFromDate = localDateIn(rangeFrom, schedule.timezone);
  const rangeToDate = localDateIn(rangeTo, schedule.timezone);

  // Cap the walk at endDate if it's earlier than the range end.
  let effectiveToYear = toYear;
  if (endDate !== null) {
    const endY = Number(endDate.split("-")[0] ?? toYear);
    if (endY < effectiveToYear) effectiveToYear = endY;
  }

  for (let year = Math.max(startYear, fromYear); year <= effectiveToYear; year += 1) {
    const startMonth = year === fromYear ? (fromYmd[1] ?? 1) : 1;
    const endMonth = year === toYear ? (toYmd[1] ?? 12) : 12;
    for (let month = startMonth; month <= endMonth; month += 1) {
      const daysInMonth = new Date(year, month, 0).getDate();
      // Skip months that don't have this day (e.g. Feb 29 only in
      // leap years). The test contract requires the dose to be
      // skipped, not rolled over to the last day of the month.
      if (day > daysInMonth) continue;
      const localDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (endDate !== null && localDate > endDate) return;
      if (localDate < schedule.startDate) continue;
      if (localDate < rangeFromDate) continue;
      // Once the local date crosses the range end there is nothing
      // left to emit anywhere. The generator is done.
      if (localDate > rangeToDate) return;
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
