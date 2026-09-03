/**
 * PawPair — bridge between notification events and the app.
 *
 * docs/AAA-HANDOFF.md §7:
 * - "Notification actions: Given, Snooze, Skip."
 * - "Deep-link to the exact occurrence."
 *
 * On iOS 16+ and Android 14+, users can mark a dose as Given
 * or Skip from the notification without opening the app. The
 * expo-notifications response listener fires a callback with
 * the action identifier. We forward that to the in-memory dose
 * store via `__setDoseLogger`, which the host wires to
 * DoseEventsRepository.
 *
 * Snooze re-schedules the same dose 15 minutes later.
 */

import { cancelNotificationForOccurrence, scheduleNotification } from "./service";
import type { NotificationAction, ScheduledNotification } from "./types";

export type DoseLogger = (params: {
  scheduleId: string;
  scheduledDoseKey: string;
  action: "given" | "skipped";
  completedBy: string;
  atUtc: string;
}) => void;

let doseLogger: DoseLogger | null = null;

export function __setDoseLogger(logger: DoseLogger | null): void {
  doseLogger = logger;
}

export function buildNotification(input: {
  scheduleId: string;
  scheduledDoseKey: string;
  petName: string;
  medicationName: string;
  fireAtUtc: string;
  discreet: boolean;
}): ScheduledNotification {
  return {
    id: input.scheduledDoseKey,
    ...input,
  };
}

export async function handleNotificationAction(input: {
  scheduleId: string;
  scheduledDoseKey: string;
  action: NotificationAction;
  caregiver: string;
}): Promise<void> {
  const { scheduleId, scheduledDoseKey, action, caregiver } = input;
  switch (action) {
    case "given":
    case "skip":
      doseLogger?.({
        scheduleId,
        scheduledDoseKey,
        action: action === "given" ? "given" : "skipped",
        completedBy: caregiver,
        atUtc: new Date().toISOString(),
      });
      await cancelNotificationForOccurrence(scheduleId, scheduledDoseKey);
      return;
    case "snooze": {
      // 15 minute snooze. The snooze replaces the original
      // registration (the platform already fired the original
      // notification; the snooze is the rescheduled replacement).
      const snoozed = await scheduleNotification({
        id: `${scheduleId}:${scheduledDoseKey}:snooze`,
        scheduleId,
        scheduledDoseKey: `${scheduledDoseKey}:snooze`,
        petName: "PawPair",
        medicationName: "Snoozed dose",
        fireAtUtc: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        discreet: true,
      });
      // Cancel the original (which is no longer relevant). The
      // snooze registration is tracked under a different
      // scheduledDoseKey so this cancel does not affect it.
      await cancelNotificationForOccurrence(scheduleId, scheduledDoseKey);
      void snoozed;
      return;
    }
  }
}
