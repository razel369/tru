import type {
  NotificationHealthReport,
  NotificationPermissionState,
  ScheduledNotification,
} from "./types";
import { requestPermissionIfNeeded } from "./permission";
import { clock } from "../../data/database/types";
import { uuid } from "../../data/database/uuid";

/**
 * PawPair — notification scheduling service.
 *
 * docs/AAA-HANDOFF.md §7. The service is intentionally
 * platform-agnostic: the production implementation uses
 * `expo-notifications`, the web implementation is a no-op,
 * and tests can substitute their own backend via
 * `__setSchedulingBackend`.
 *
 * Every operation is idempotent: scheduling a notification that
 * already exists in the registry replaces the previous one
 * (matching the same `scheduleId + scheduledDoseKey`). The
 * `notification_registrations` table (schema v1) is the
 * authoritative source of truth.
 */

export type SchedulingBackend = {
  /**
   * Schedule a single notification. Returns the platform-side id
   * (e.g. an Expo push token) or null if the platform refused.
   */
  schedule(input: ScheduledNotification): Promise<string | null>;
  /** Cancel a previously scheduled notification. */
  cancel(platformId: string): Promise<void>;
  /** Cancel all notifications owned by this schedule. */
  cancelByScheduleId(scheduleId: string): Promise<number>;
};

let backend: SchedulingBackend = {
  async schedule(): Promise<string | null> {
    return null;
  },
  async cancel(): Promise<void> {
    return;
  },
  async cancelByScheduleId(): Promise<number> {
    return 0;
  },
};

let activeRegistrations = new Map<string, { id: string; scheduleId: string; scheduledForUtc: string }>();
let lastRegistrationAtUtc: string | null = null;
let lastDeliveryAtUtc: string | null = null;
let failureCount = 0;

export function __setSchedulingBackend(next: SchedulingBackend): void {
  backend = next;
}

export function __resetNotificationStateForTests(): void {
  activeRegistrations = new Map();
  lastRegistrationAtUtc = null;
  lastDeliveryAtUtc = null;
  failureCount = 0;
}

function internalKey(input: ScheduledNotification): string {
  return `${input.scheduleId}::${input.scheduledDoseKey}`;
}

export async function scheduleNotification(
  input: ScheduledNotification,
): Promise<string | null> {
  try {
    const platformId = await backend.schedule(input);
    if (platformId === null) {
      failureCount += 1;
      return null;
    }
    activeRegistrations.set(internalKey(input), {
      id: platformId,
      scheduleId: input.scheduleId,
      scheduledForUtc: input.fireAtUtc,
    });
    lastRegistrationAtUtc = clock.nowIso();
    return platformId;
  } catch (error) {
    failureCount += 1;
    // eslint-disable-next-line no-console
    console.warn("[pawpair] scheduleNotification failed", error);
    return null;
  }
}

export async function cancelNotificationForOccurrence(
  scheduleId: string,
  scheduledDoseKey: string,
): Promise<void> {
  const key = `${scheduleId}::${scheduledDoseKey}`;
  const entry = activeRegistrations.get(key);
  if (!entry) return;
  await backend.cancel(entry.id);
  activeRegistrations.delete(key);
}

export async function rescheduleForSchedule(
  scheduleId: string,
  notifications: ScheduledNotification[],
): Promise<void> {
  // Cancel all current registrations for this schedule.
  const cancelled = await backend.cancelByScheduleId(scheduleId);
  activeRegistrations.forEach((value, key) => {
    if (value.scheduleId === scheduleId) activeRegistrations.delete(key);
  });
  failureCount += Math.max(0, cancelled);
  for (const n of notifications) {
    await scheduleNotification(n);
  }
}

export async function buildHealthReport(
  permission: NotificationPermissionState,
): Promise<NotificationHealthReport> {
  return {
    permission,
    scheduled: activeRegistrations.size,
    lastRegistrationAtUtc,
    lastDeliveryAtUtc,
    failures: failureCount,
  };
}

export function recordDelivery(): void {
  lastDeliveryAtUtc = clock.nowIso();
}

export function newNotificationId(): string {
  return uuid();
}

export async function ensurePermission(): Promise<NotificationPermissionState> {
  const result = await requestPermissionIfNeeded();
  return result.state;
}
