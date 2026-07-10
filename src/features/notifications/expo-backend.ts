/**
 * PawPair — production notification backend (expo-notifications).
 *
 * Lazy-loaded so the module is only imported on a real device.
 * Tests and the web bundle continue to use the no-op default
 * from ./service.
 */

import type { SchedulingBackend } from "./service";
import type { ScheduledNotification } from "./types";

export async function makeExpoBackend(): Promise<SchedulingBackend> {
  // Imported lazily so this file can be loaded in environments
  // (web, tests) where the native module is not present.
  const Notifications = await import("expo-notifications");
  return {
    async schedule(input: ScheduledNotification): Promise<string | null> {
      const trigger = new Date(input.fireAtUtc);
      const id = `${input.scheduleId}-${input.scheduledDoseKey}-${trigger.getTime()}`;
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: id,
          content: {
            title: input.discreet
              ? "PawPair"
              : `${input.petName}: ${input.medicationName}`,
            body: input.discreet
              ? "It's time to log a dose."
              : "Tap to confirm in the app.",
            data: {
              scheduleId: input.scheduleId,
              scheduledDoseKey: input.scheduledDoseKey,
              action: "open",
            },
            categoryIdentifier: "pawpair.dose",
          },
          trigger: {
            type: "date",
            date: trigger,
          } as unknown as import("expo-notifications").NotificationTriggerInput,
        });
        return id;
      } catch {
        return null;
      }
    },
    async cancel(platformId: string): Promise<void> {
      try {
        await Notifications.cancelScheduledNotificationAsync(platformId);
      } catch {
        // Best-effort cancel; missing registration is not an error.
      }
    },
    async cancelByScheduleId(scheduleId: string): Promise<number> {
      try {
        const all = await Notifications.getAllScheduledNotificationsAsync();
        const own = all.filter((n) =>
          String(n.identifier).startsWith(`${scheduleId}-`),
        );
        for (const n of own) {
          await Notifications.cancelScheduledNotificationAsync(n.identifier);
        }
        return own.length;
      } catch {
        return 0;
      }
    },
  };
}
