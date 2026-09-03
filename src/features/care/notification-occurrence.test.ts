import { describe, expect, it } from "vitest";

import type { Pet } from "../../types";
import type { CareNotificationActionTarget } from "../notifications/care-runtime";
import { scheduledCareFromNotificationAction } from "./notification-occurrence";
import type { CareTask } from "./types";

const pet: Pet = {
  age: 4,
  avatar: "luna",
  breed: "British Shorthair",
  color: "#999999",
  id: "pet-luna",
  medications: [],
  name: "Luna",
  species: "cat",
};

function task(overrides: Partial<CareTask> = {}): CareTask {
  return {
    category: "medication",
    createdAt: "2026-07-19T00:00:00.000Z",
    enabled: true,
    id: "medicine",
    instructions: "",
    petId: pet.id,
    schedule: { frequency: "daily", times: ["08:00"] },
    title: "Heart medicine",
    ...overrides,
  };
}

function action(
  overrides: Partial<CareNotificationActionTarget> = {},
): CareNotificationActionTarget {
  return {
    action: "done",
    date: "2026-07-22",
    petId: pet.id,
    scheduledTime: "08:00",
    taskId: "medicine",
    ...overrides,
  };
}

describe("notification occurrence validation", () => {
  it("builds the exact scheduled care occurrence", () => {
    expect(scheduledCareFromNotificationAction(action(), [task()], [pet])).toMatchObject({
      date: "2026-07-22",
      id: "2026-07-22:medicine:08:00",
      pet,
      scheduledTime: "08:00",
      status: "due",
      task: { id: "medicine" },
    });
  });

  it("rejects disabled, appointment, orphaned, and stale-time actions", () => {
    expect(
      scheduledCareFromNotificationAction(action(), [task({ enabled: false })], [pet]),
    ).toBeNull();
    expect(
      scheduledCareFromNotificationAction(
        action(),
        [task({ category: "appointment" })],
        [pet],
      ),
    ).toBeNull();
    expect(
      scheduledCareFromNotificationAction(action({ petId: "missing" }), [task()], [pet]),
    ).toBeNull();
    expect(
      scheduledCareFromNotificationAction(
        action({ scheduledTime: "09:00" }),
        [task()],
        [pet],
      ),
    ).toBeNull();
  });

  it("enforces real dates and frequency rules", () => {
    expect(
      scheduledCareFromNotificationAction(action({ date: "2026-02-31" }), [task()], [pet]),
    ).toBeNull();
    expect(
      scheduledCareFromNotificationAction(
        action({ date: "2026-07-22" }),
        [task({ schedule: { date: "2026-07-23", frequency: "once", times: ["08:00"] } })],
        [pet],
      ),
    ).toBeNull();
    expect(
      scheduledCareFromNotificationAction(
        action({ date: "2026-07-22" }),
        [task({ schedule: { frequency: "weekly", times: ["08:00"], weekdays: [4] } })],
        [pet],
      ),
    ).toBeNull();
    expect(
      scheduledCareFromNotificationAction(
        action({ date: "2026-07-23" }),
        [task({ schedule: { frequency: "weekly", times: ["08:00"], weekdays: [4] } })],
        [pet],
      ),
    ).not.toBeNull();
  });
});
