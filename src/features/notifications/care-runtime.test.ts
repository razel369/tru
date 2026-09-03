import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Pet } from "../../types";
import type { CareTask, HealthRecord } from "../care/types";

type MockNotification = {
  content: {
    body?: string;
    data?: Record<string, unknown>;
    title?: string;
  };
  identifier: string;
  trigger?: Record<string, unknown>;
};

const native = vi.hoisted(() => ({
  canceled: [] as string[],
  lastResponse: null as MockNotificationResponse | null,
  permission: { canAskAgain: true, granted: true },
  platform: { OS: "ios" },
  responseListener: null as ((response: MockNotificationResponse) => void) | null,
  scheduled: [] as MockNotification[],
  storage: new Map<string, string>(),
}));

type MockNotificationResponse = {
  actionIdentifier: string;
  notification: { date: number; request: MockNotification };
};

vi.mock("react-native", () => ({ Platform: native.platform }));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => native.storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      native.storage.set(key, value);
    }),
  },
}));

vi.mock("expo-notifications", () => ({
  DEFAULT_ACTION_IDENTIFIER: "default",
  addNotificationResponseReceivedListener: vi.fn(
    (listener: (response: MockNotificationResponse) => void) => {
      native.responseListener = listener;
      return { remove: vi.fn() };
    },
  ),
  clearLastNotificationResponseAsync: vi.fn(async () => {
    native.lastResponse = null;
  }),
  cancelScheduledNotificationAsync: vi.fn(async (identifier: string) => {
    native.canceled.push(identifier);
    native.scheduled = native.scheduled.filter(
      (notification) => notification.identifier !== identifier,
    );
  }),
  getAllScheduledNotificationsAsync: vi.fn(async () => [...native.scheduled]),
  getPermissionsAsync: vi.fn(async () => ({ ...native.permission })),
  getLastNotificationResponseAsync: vi.fn(async () => native.lastResponse),
  requestPermissionsAsync: vi.fn(async () => ({ ...native.permission })),
  scheduleNotificationAsync: vi.fn(async (request: MockNotification) => {
    native.scheduled = native.scheduled.filter(
      (notification) => notification.identifier !== request.identifier,
    );
    native.scheduled.push(request);
    return request.identifier;
  }),
  setNotificationCategoryAsync: vi.fn(async () => undefined),
  setNotificationHandler: vi.fn(),
}));

import {
  getCareReminderPrivacy,
  setCareReminderPrivacy,
  setCareRemindersEnabled,
  subscribeCareNotificationActions,
  subscribeCareNotificationTargets,
} from "./care-runtime";

const pet: Pet = {
  age: 4,
  avatar: "luna",
  breed: "British Shorthair",
  color: "#9A9A9A",
  id: "pet-luna",
  medications: [],
  name: "Luna",
  species: "cat",
};

function task(
  id: string,
  overrides: Partial<CareTask> = {},
): CareTask {
  return {
    category: "feeding",
    createdAt: "2026-07-19T00:00:00.000Z",
    enabled: true,
    id,
    instructions: "",
    petId: pet.id,
    schedule: { frequency: "daily", times: ["08:00"] },
    title: `Care ${id}`,
    ...overrides,
  };
}

function healthRecord(
  id: string,
  nextDueDate: string,
  overrides: Partial<HealthRecord> = {},
): HealthRecord {
  return {
    createdAt: "2026-07-19T00:00:00.000Z",
    date: "2025-07-27",
    id,
    nextDueDate,
    petId: pet.id,
    title: "Rabies booster",
    type: "vaccination",
    ...overrides,
  };
}

describe("native care reminder runtime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    native.canceled.length = 0;
    native.permission = { canAskAgain: true, granted: true };
    native.platform.OS = "ios";
    native.scheduled = [];
    native.storage.clear();
    vi.clearAllMocks();
  });

  it("enables reminders and keeps notification content private by default", async () => {
    const state = await setCareRemindersEnabled(
      true,
      [task("breakfast")],
      [pet],
    );

    expect(state).toEqual({
      enabled: true,
      limited: false,
      permission: "granted",
      requested: 1,
      scheduled: 1,
    });
    expect(native.scheduled[0]).toMatchObject({
      content: {
        body: "A care moment for Luna is ready.",
        data: { owner: "pawpair-care", petId: pet.id, taskId: "breakfast" },
        title: "PawPair reminder",
      },
      trigger: { hour: 8, minute: 0, type: "daily" },
    });
  });

  it("reschedules existing reminders when detailed privacy is selected", async () => {
    const medication = task("medicine", {
      category: "medication",
      title: "Heart medicine",
    });
    await setCareRemindersEnabled(true, [medication], [pet]);
    expect(await setCareReminderPrivacy("detailed", [medication], [pet])).toBe(
      "detailed",
    );

    expect(await getCareReminderPrivacy()).toBe("detailed");
    expect(native.scheduled).toHaveLength(1);
    expect(native.scheduled[0]?.content).toMatchObject({
      body: "Time for Heart medicine.",
      title: "Luna's care moment",
    });
  });

  it("rejects malformed times instead of partially parsing them", async () => {
    const state = await setCareRemindersEnabled(
      true,
      [task("bad-time", { schedule: { frequency: "daily", times: ["08:30:99"] } })],
      [pet],
    );

    expect(state.scheduled).toBe(0);
    expect(native.scheduled).toEqual([]);
  });

  it("removes owned reminders when notification permission is denied", async () => {
    native.permission = { canAskAgain: false, granted: false };
    native.scheduled = [
      {
        content: { data: { owner: "pawpair-care" } },
        identifier: "pawpair-stale",
      },
      {
        content: { data: { owner: "another-app" } },
        identifier: "external-reminder",
      },
    ];

    const state = await setCareRemindersEnabled(
      true,
      [task("breakfast")],
      [pet],
    );

    expect(state).toEqual({
      enabled: false,
      limited: false,
      permission: "denied",
      requested: 0,
      scheduled: 0,
    });
    expect(native.canceled).toEqual(["pawpair-stale"]);
    expect(native.scheduled.map((item) => item.identifier)).toEqual([
      "external-reminder",
    ]);
  });

  it("reconciles stale owned reminders without touching other apps", async () => {
    native.scheduled = [
      {
        content: { data: { owner: "pawpair-care" } },
        identifier: "pawpair-stale",
      },
      {
        content: { data: { owner: "another-app" } },
        identifier: "external-reminder",
      },
    ];

    await setCareRemindersEnabled(true, [task("breakfast")], [pet]);

    expect(native.canceled).toEqual(["pawpair-stale"]);
    expect(native.scheduled.map((item) => item.identifier).sort()).toEqual([
      "external-reminder",
      "pawpair-care-breakfast-daily-0",
    ]);
  });

  it("respects the iOS capacity while prioritizing medication reminders", async () => {
    const feeding = Array.from({ length: 60 }, (_, index) =>
      task(`feeding-${String(index).padStart(2, "0")}`),
    );
    const medications = Array.from({ length: 5 }, (_, index) =>
      task(`medication-${index}`, {
        category: "medication",
        title: `Medication ${index}`,
      }),
    );

    const state = await setCareRemindersEnabled(
      true,
      [...feeding, ...medications],
      [pet],
    );

    expect(state.scheduled).toBe(60);
    expect(state.requested).toBe(65);
    expect(state.limited).toBe(true);
    expect(native.scheduled).toHaveLength(60);
    expect(
      medications.every((item) =>
        native.scheduled.some((request) =>
          request.identifier.includes(item.id),
        ),
      ),
    ).toBe(true);
  });

  it("does not apply the iOS capacity limit on Android", async () => {
    native.platform.OS = "android";
    const tasks = Array.from({ length: 65 }, (_, index) =>
      task(`android-${String(index).padStart(2, "0")}`),
    );

    const state = await setCareRemindersEnabled(true, tasks, [pet]);

    expect(state).toMatchObject({ limited: false, requested: 65, scheduled: 65 });
    expect(native.scheduled).toHaveLength(65);
  });

  it("schedules private health follow-ups seven days before and when due", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 19, 8, 0, 0));

    const state = await setCareRemindersEnabled(
      true,
      [],
      [pet],
      [healthRecord("rabies", "2026-07-27")],
    );

    expect(state).toMatchObject({ requested: 2, scheduled: 2 });
    expect(native.scheduled).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          identifier: "pawpair-care-health-rabies-lead-7",
          content: expect.objectContaining({
            body: "A health follow-up for Luna is coming up.",
            data: expect.objectContaining({ healthRecordId: "rabies" }),
          }),
          trigger: expect.objectContaining({
            date: new Date(2026, 6, 20, 9, 0, 0),
            type: "date",
          }),
        }),
        expect.objectContaining({
          identifier: "pawpair-care-health-rabies-due",
          content: expect.objectContaining({
            body: "A health follow-up for Luna is due today.",
          }),
          trigger: expect.objectContaining({
            date: new Date(2026, 6, 27, 9, 0, 0),
            type: "date",
          }),
        }),
      ]),
    );
  });

  it("reschedules health follow-ups with detailed lock screen content", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 19, 8, 0, 0));
    const record = healthRecord("detailed-rabies", "2026-07-27");
    await setCareRemindersEnabled(true, [], [pet], [record]);

    await setCareReminderPrivacy("detailed", [], [pet], [record]);

    expect(native.scheduled).toHaveLength(2);
    expect(native.scheduled).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.objectContaining({
            body: "Rabies booster is due in 7 days.",
            title: "Luna's health follow-up",
          }),
        }),
        expect.objectContaining({
          content: expect.objectContaining({
            body: "Rabies booster is due today.",
            title: "Luna's health follow-up",
          }),
        }),
      ]),
    );
  });

  it("ignores malformed health follow-up dates", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 19, 8, 0, 0));

    const state = await setCareRemindersEnabled(
      true,
      [],
      [pet],
      [healthRecord("invalid", "2026-02-31")],
    );

    expect(state).toMatchObject({ requested: 0, scheduled: 0 });
  });

  it("keeps near-term health follow-ups inside the iOS capacity", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 19, 8, 0, 0));
    const feeding = Array.from({ length: 60 }, (_, index) =>
      task(`capacity-${String(index).padStart(2, "0")}`),
    );

    const state = await setCareRemindersEnabled(
      true,
      feeding,
      [pet],
      [healthRecord("priority", "2026-07-27")],
    );

    expect(state).toMatchObject({ limited: true, requested: 62, scheduled: 60 });
    expect(
      native.scheduled.filter((request) =>
        request.identifier.includes("health-priority"),
      ),
    ).toHaveLength(2);
  });

  it("routes notification taps to the matching pet surface", async () => {
    await setCareRemindersEnabled(true, [task("walk")], [pet]);
    const targets: unknown[] = [];
    const unsubscribe = subscribeCareNotificationTargets((target) => {
      targets.push(target);
    });

    native.responseListener?.({
      actionIdentifier: "default",
      notification: {
        date: new Date(2026, 6, 20, 9, 0, 0).getTime(),
        request: {
          content: {
            data: {
              healthRecordId: "rabies",
              owner: "pawpair-care",
              petId: pet.id,
            },
          },
          identifier: "health-response",
        },
      },
    });
    native.responseListener?.({
      actionIdentifier: "default",
      notification: {
        date: new Date(2026, 6, 20, 10, 0, 0).getTime(),
        request: {
          content: {
            data: {
              owner: "pawpair-care",
              petId: pet.id,
              scheduleDate: "2026-07-21",
              taskId: "walk",
            },
          },
          identifier: "care-response",
        },
      },
    });
    native.responseListener?.({
      actionIdentifier: "default",
      notification: {
        date: new Date(2026, 6, 21, 10, 0, 0).getTime(),
        request: {
          content: {
            data: { owner: "pawpair-care", petId: pet.id, taskId: "walk" },
          },
          identifier: "care-response",
        },
      },
    });

    expect(targets).toEqual([
      { kind: "health", petId: pet.id, sourceId: "rabies" },
      {
        date: "2026-07-21",
        kind: "care",
        petId: pet.id,
        sourceId: "walk",
      },
      { kind: "care", petId: pet.id, sourceId: "walk" },
    ]);
    unsubscribe();
  });

  it("delivers done and skip care actions with the exact occurrence", async () => {
    await setCareRemindersEnabled(true, [task("medicine", { category: "medication" })], [pet]);
    const actions: unknown[] = [];
    const unsubscribe = subscribeCareNotificationActions((action) => {
      actions.push(action);
    });
    const deliveredAt = new Date(2026, 6, 22, 8, 0, 0).getTime();
    const request: MockNotification = {
      content: {
        data: {
          owner: "pawpair-care",
          petId: pet.id,
          scheduledTime: "08:00",
          taskId: "medicine",
        },
      },
      identifier: "medicine-response",
    };

    native.responseListener?.({
      actionIdentifier: "pawpair.mark-done",
      notification: { date: deliveredAt, request },
    });
    native.responseListener?.({
      actionIdentifier: "pawpair.skip",
      notification: {
        date: deliveredAt + 24 * 60 * 60 * 1000,
        request,
      },
    });

    expect(actions).toEqual([
      {
        action: "done",
        date: "2026-07-22",
        petId: pet.id,
        scheduledTime: "08:00",
        taskId: "medicine",
      },
      {
        action: "skipped",
        date: "2026-07-23",
        petId: pet.id,
        scheduledTime: "08:00",
        taskId: "medicine",
      },
    ]);
    unsubscribe();
  });

  it("keeps the original occurrence date when snooze crosses midnight", async () => {
    await setCareRemindersEnabled(true, [task("late-care")], [pet]);
    const actions: unknown[] = [];
    const unsubscribe = subscribeCareNotificationActions((action) => {
      actions.push(action);
    });
    const originalRequest: MockNotification = {
      content: {
        data: {
          owner: "pawpair-care",
          petId: pet.id,
          scheduledTime: "23:55",
          taskId: "late-care",
        },
      },
      identifier: "late-care-response",
    };

    native.responseListener?.({
      actionIdentifier: "pawpair.snooze-15",
      notification: {
        date: new Date(2026, 6, 22, 23, 55, 0).getTime(),
        request: originalRequest,
      },
    });
    await vi.waitFor(() => {
      expect(
        native.scheduled.some((request) =>
          request.identifier.startsWith("late-care-response-snooze-"),
        ),
      ).toBe(true);
    });
    const snoozed = native.scheduled.find((request) =>
      request.identifier.startsWith("late-care-response-snooze-"),
    );
    expect(snoozed?.content.data).toMatchObject({
      occurrenceDate: "2026-07-22",
    });

    native.responseListener?.({
      actionIdentifier: "pawpair.mark-done",
      notification: {
        date: new Date(2026, 6, 23, 0, 10, 0).getTime(),
        request: snoozed as MockNotification,
      },
    });

    expect(actions).toEqual([
      {
        action: "done",
        date: "2026-07-22",
        petId: pet.id,
        scheduledTime: "23:55",
        taskId: "late-care",
      },
    ]);
    unsubscribe();
  });
});
