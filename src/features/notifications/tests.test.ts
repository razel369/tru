/**
 * PawPair — notification service tests.
 *
 * Uses the in-memory backend so we never touch expo-notifications
 * in the test runner (which would require the native module).
 * The contract is: the same backend can be swapped to the
 * expo-notifications adapter at app start; the business logic
 * in the service and bridge modules does not change.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { clock } from "../../data/database/types";
import {
  __resetNotificationStateForTests,
  __setSchedulingBackend,
  buildHealthReport,
  cancelNotificationForOccurrence,
  recordDelivery,
  rescheduleForSchedule,
  scheduleNotification,
 ensurePermission } from "./service";
import {
  __setPermissionBackend,
  getPermissionState,
  requestPermissionIfNeeded,
} from "./permission";
import type { ScheduledNotification } from "./types";
import { handleNotificationAction, __setDoseLogger } from "./bridge";


function makeNotification(overrides: Partial<ScheduledNotification> = {}): ScheduledNotification {
  return {
    id: "n-1",
    scheduleId: "s-1",
    scheduledDoseKey: "2026-07-10::08:00",
    petName: "Milo",
    medicationName: "Carprofen",
    fireAtUtc: "2026-07-10T08:00:00.000Z",
    discreet: false,
    ...overrides,
  };
}

describe("notification permission", () => {
  afterEach(() => {
    __setPermissionBackend(
      async () => ({ state: "unsupported", askedAtUtc: new Date().toISOString() }),
      async () => "unsupported",
    );
  });

  it("falls back to 'unsupported' when no backend is configured", async () => {
    expect(await getPermissionState()).toBe("unsupported");
    const r = await requestPermissionIfNeeded();
    expect(r.state).toBe("unsupported");
  });

  it("uses the configured backend when wired", async () => {
    __setPermissionBackend(
      async () => ({ state: "granted", askedAtUtc: "2026-07-10T00:00:00.000Z" }),
      async () => "granted",
    );
    expect(await getPermissionState()).toBe("granted");
    const r = await requestPermissionIfNeeded();
    expect(r.state).toBe("granted");
    expect(r.askedAtUtc).toBe("2026-07-10T00:00:00.000Z");
  });
});

describe("notification scheduling", () => {
  beforeEach(() => {
    clock.__setNow(() => new Date("2026-07-10T00:00:00.000Z"));
  });

  afterEach(() => {
    __setSchedulingBackend({
      async schedule() {
        return null;
      },
      async cancel() {},
      async cancelByScheduleId() {
        return 0;
      },
    });
    __resetNotificationStateForTests();
    clock.__reset();
  });

  it("schedules a notification and tracks the registration", async () => {
    __setSchedulingBackend({
      async schedule() {
        return "platform-1";
      },
      async cancel() {},
      async cancelByScheduleId() {
        return 0;
      },
    });
    const id = await scheduleNotification(makeNotification());
    expect(id).toBe("platform-1");
    const report = await buildHealthReport("granted");
    expect(report.scheduled).toBe(1);
    expect(report.lastRegistrationAtUtc).toBe("2026-07-10T00:00:00.000Z");
    expect(report.failures).toBe(0);
  });

  it("counts failures when the backend returns null", async () => {
    __setSchedulingBackend({
      async schedule() {
        return null;
      },
      async cancel() {},
      async cancelByScheduleId() {
        return 0;
      },
    });
    const id = await scheduleNotification(makeNotification());
    expect(id).toBeNull();
    const report = await buildHealthReport("granted");
    expect(report.failures).toBe(1);
    expect(report.scheduled).toBe(0);
  });

  it("cancels a specific occurrence", async () => {
    let cancelCount = 0;
    __setSchedulingBackend({
      async schedule() {
        return "platform-x";
      },
      async cancel() {
        cancelCount += 1;
      },
      async cancelByScheduleId() {
        return 0;
      },
    });
    await scheduleNotification(makeNotification());
    await cancelNotificationForOccurrence("s-1", "2026-07-10::08:00");
    expect(cancelCount).toBe(1);
    const report = await buildHealthReport("granted");
    expect(report.scheduled).toBe(0);
  });

  it("reschedules every notification for a schedule", async () => {
    let count = 0;
    __setSchedulingBackend({
      async schedule() {
        count += 1;
        return `p-${count}`;
      },
      async cancel() {},
      async cancelByScheduleId() {
        return 1;
      },
    });
    await scheduleNotification(makeNotification());
    await rescheduleForSchedule("s-1", [
      makeNotification({ scheduledDoseKey: "2026-07-11::08:00" }),
      makeNotification({ scheduledDoseKey: "2026-07-12::08:00" }),
    ]);
    const report = await buildHealthReport("granted");
    expect(report.scheduled).toBe(2);
  });
});

describe("notification actions", () => {
  beforeEach(() => {
    clock.__setNow(() => new Date("2026-07-10T08:00:00.000Z"));
  });
  afterEach(() => {
    clock.__reset();
    __resetNotificationStateForTests();
  });

  it("'given' invokes the dose logger and cancels the notification", async () => {
    let logged: { status: string; by: string } | null = null;
    __setDoseLogger((params) => {
      logged = { status: params.action, by: params.completedBy };
    });
    __setSchedulingBackend({
      async schedule() {
        return "p";
      },
      async cancel() {},
      async cancelByScheduleId() {
        return 0;
      },
    });
    await scheduleNotification(makeNotification());
    await handleNotificationAction({
      scheduleId: "s-1",
      scheduledDoseKey: "2026-07-10::08:00",
      action: "given",
      caregiver: "Maya",
    });
    expect(logged).toEqual({ status: "given", by: "Maya" });
    const report = await buildHealthReport("granted");
    expect(report.scheduled).toBe(0);
  });

  it("'snooze' re-schedules 15 minutes later", async () => {
    __setDoseLogger(() => undefined);
    __setSchedulingBackend({
      async schedule() {
        return "p";
      },
      async cancel() {},
      async cancelByScheduleId() {
        return 0;
      },
    });
    await scheduleNotification(makeNotification());
    await handleNotificationAction({
      scheduleId: "s-1",
      scheduledDoseKey: "2026-07-10::08:00",
      action: "snooze",
      caregiver: "Maya",
    });
    const report = await buildHealthReport("granted");
    expect(report.scheduled).toBe(1);
  });
});

describe("health report", () => {
  it("records delivery", async () => {
    clock.__setNow(() => new Date("2026-07-10T08:00:00.000Z"));
    recordDelivery();
    const report = await buildHealthReport("granted");
    expect(report.lastDeliveryAtUtc).toBe("2026-07-10T08:00:00.000Z");
    clock.__reset();
  });
});

describe("ensurePermission", () => {
  it("forwards to the permission backend", async () => {
    __setPermissionBackend(
      async () => ({ state: "granted", askedAtUtc: "2026-07-10T08:00:00.000Z" }),
      async () => "granted",
    );
    expect(await ensurePermission()).toBe("granted");
  });
});

describe("handleNotificationAction integration", () => {
  it("'skip' invokes the dose logger with status 'skipped' and cancels", async () => {
    let logged: { status: string; by: string; key: string } | null = null;
    __setDoseLogger((params) => {
      logged = {
        status: params.action,
        by: params.completedBy,
        key: params.scheduledDoseKey,
      };
    });
    __setSchedulingBackend({
      async schedule() {
        return "p";
      },
      async cancel() {
        return;
      },
      async cancelByScheduleId() {
        return 0;
      },
    });
    await scheduleNotification(makeNotification());
    await handleNotificationAction({
      scheduleId: "s-1",
      scheduledDoseKey: "2026-07-10::08:00",
      action: "skip",
      caregiver: "Alex",
    });
    expect(logged).toEqual({
      status: "skipped",
      by: "Alex",
      key: "2026-07-10::08:00",
    });
    const report = await buildHealthReport("granted");
    expect(report.scheduled).toBe(0);
  });
});
