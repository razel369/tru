/**
 * PawPair — occurrence → notification bridge.
 *
 * docs/AAA-HANDOFF.md §7:
 * - "Schedule locally so reminders work offline."
 * - "Reschedule after medication edits, timezone changes, and
 *    app upgrades."
 * - "Show an in-app notification health screen when
 *    permissions are disabled."
 * - "Never claim Critical Alerts unless the Apple entitlement is
 *    actually granted."
 *
 * This module walks the schedule engine's occurrences for a
 * forward-looking horizon (default 7 days) and registers a
 * local notification for each. Schedules that have already
 * been delivered are filtered out by the caller.
 */

import { EVERY_DAY, generateOccurrences } from "../schedules";
import type { Occurrence, Schedule } from "../schedules";
import type { Pet } from "../../types";
import { rescheduleForSchedule } from "./service";
import { buildNotification } from "./bridge";
import type { ScheduledNotification } from "./types";

export const DEFAULT_HORIZON_DAYS = 7;

function medicationToSchedule(
  petId: string,
  medication: {
    id: string;
    times: string[];
  },
  startDate: string,
): Schedule {
  return {
    id: `med-${petId}-${medication.id}`,
    medicationId: medication.id,
    timezone: "UTC",
    startDate,
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

function toNotification(
  pet: Pet,
  medication: { id: string; name: string; discreet?: boolean | null },
  occurrence: Occurrence,
): ScheduledNotification {
  return buildNotification({
    scheduleId: occurrence.scheduleId,
    scheduledDoseKey: occurrence.key,
    petName: pet.name,
    medicationName: medication.name,
    fireAtUtc: occurrence.scheduledForUtc,
    discreet: medication.discreet === true,
  });
}

/**
 * Schedule local notifications for every pet/medication in the
 * given pet list, looking ahead `horizonDays` from `from`.
 *
 * Returns the list of scheduled notifications for use in
 * health reports and tests.
 */
export async function scheduleAllPets(
  pets: Pet[],
  from: Date,
  horizonDays = DEFAULT_HORIZON_DAYS,
): Promise<ScheduledNotification[]> {
  const to = new Date(from.getTime() + horizonDays * 24 * 60 * 60 * 1000);
  const startDate = from.toISOString().slice(0, 10);
  const result: ScheduledNotification[] = [];

  for (const pet of pets) {
    for (const medication of pet.medications) {
      const schedule = medicationToSchedule(pet.id, medication, startDate);
      const occurrences = generateOccurrences(schedule, from, to);
      const notifications = occurrences.map((occ) =>
        toNotification(pet, medication, occ),
      );
      result.push(...notifications);
      await rescheduleForSchedule(schedule.id, notifications);
    }
  }
  return result;
}
