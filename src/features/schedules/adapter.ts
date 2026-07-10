/**
 * PawPair — adapter from the legacy `Medication.times: string[]`
 * shape to the new Schedule + Occurrence engine.
 *
 * The prototype UI still consumes `ScheduledDose[]` from
 * `src/schedule.ts`. This adapter lets the new engine drive the
 * same shape so we can wire the engine into Today without
 * rewriting the rest of the app. Stage 7 will replace
 * `buildSchedule` outright.
 */

import type { DoseLog, Pet, ScheduledDose } from "../../types";
import {
  EVERY_DAY,
  generateOccurrences,
} from "./index";
import type { Occurrence, Schedule } from "./types";

function medicationToSchedule(medicationId: string, medication: {
  times: string[];
}): Schedule {
  return {
    id: `med-${medicationId}`,
    medicationId,
    timezone: "UTC", // prototype timezone until the on-device TZ ships
    startDate: "1970-01-01",
    endDate: null,
    times: medication.times,
    weekdayMask: EVERY_DAY,
    everyN: null,
    cycleOnDays: null,
    cycleOffDays: null,
    taperPhases: [],
    paused: false,
    prnMinIntervalMinutes: 0,
    type: "daily",
  };
}

function isOnDate(
  log: DoseLog,
  occurrence: Occurrence,
): boolean {
  return (
    log.medicationId === occurrence.scheduleId.replace(/^med-/, "") &&
    log.scheduledTime === occurrence.localTime &&
    log.date === occurrence.localDate
  );
}

function statusFor(
  occurrence: Occurrence,
  logs: DoseLog[],
  nowMinutes: number,
): ScheduledDose["status"] {
  const log = logs.find((entry) => isOnDate(entry, occurrence));
  if (log) return log.status;
  const minutes = toMinutes(occurrence.localTime);
  if (minutes < nowMinutes - 60) return "missed";
  if (minutes <= nowMinutes + 30) return "due";
  return "upcoming";
}

function toMinutes(time: string): number {
  const parts = time.split(":");
  const h = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 0);
  return h * 60 + m;
}

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function findPet(pets: Pet[], medicationId: string): Pet | undefined {
  return pets.find((pet) =>
    pet.medications.some((med) => med.id === medicationId),
  );
}

function findMedication(pets: Pet[], medicationId: string) {
  for (const pet of pets) {
    const found = pet.medications.find((med) => med.id === medicationId);
    if (found) return { pet, medication: found };
  }
  return null;
}

/**
 * Generate the day's `ScheduledDose[]` using the new engine.
 * Drop-in replacement for the legacy `buildSchedule` in
 * `src/schedule.ts`. Currently only the `daily` kind is exposed
 * because the legacy shape has no way to carry weekday masks
 * or every-N cadence; multi-kind support lands in stage 7 when
 * the `Medication` type gains a `schedule` field.
 */
export function buildScheduleFromEngine(
  pets: Pet[],
  logs: DoseLog[],
  date: Date,
  nowMinutes = date.getHours() * 60 + date.getMinutes(),
): ScheduledDose[] {
  const startOfDay = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0),
  );
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const out: ScheduledDose[] = [];

  for (const pet of pets) {
    for (const medication of pet.medications) {
      const schedule = medicationToSchedule(medication.id, medication);
      const occurrences = generateOccurrences(
        schedule,
        startOfDay,
        endOfDay,
      );
      for (const occ of occurrences) {
        // The new engine emits occurrences for any day in the
        // schedule's open-ended window. Restrict to the requested
        // day. Stage 7 will replace this with multi-day ranges.
        if (occ.localDate !== dateKey(date)) continue;
        const matchingLog = logs.find(
          (entry) =>
            entry.petId === pet.id &&
            entry.medicationId === medication.id &&
            entry.date === occ.localDate &&
            entry.scheduledTime === occ.localTime,
        );
        out.push({
          id: occ.key,
          pet,
          medication,
          scheduledTime: occ.localTime,
          status: statusFor(occ, logs, nowMinutes),
          ...(matchingLog ? { log: matchingLog } : {}),
        });
      }
    }
  }
  return out.sort(
    (first, second) =>
      toMinutes(first.scheduledTime) - toMinutes(second.scheduledTime),
  );
}

export { findPet, findMedication };
