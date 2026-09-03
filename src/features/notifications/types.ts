/**
 * PawPair — notification types.
 *
 * docs/AAA-HANDOFF.md §7 requires:
 * - Permission only after first schedule
 * - Locally scheduled so reminders work offline
 * - Notification actions: Given, Snooze, Skip
 * - Deep-link to the exact occurrence
 * - Reschedule on edits, timezone changes, and app upgrades
 * - In-app notification health screen
 * - Discreet mode that doesn't expose medication names
 */

export type NotificationAction = "given" | "snooze" | "skip";

export type NotificationPermissionState =
  | "granted"
  | "denied"
  | "undetermined"
  | "unsupported";

export interface ScheduledNotification {
  id: string;
  scheduleId: string;
  scheduledDoseKey: string;
  petName: string;
  medicationName: string;
  fireAtUtc: string;
  /** Use a neutral string when true; never leak the medication name. */
  discreet: boolean;
}

export interface NotificationHealthReport {
  permission: NotificationPermissionState;
  scheduled: number;
  lastRegistrationAtUtc: string | null;
  lastDeliveryAtUtc: string | null;
  failures: number;
}
