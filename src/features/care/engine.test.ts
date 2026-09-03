import { describe, expect, it } from "vitest";

import type { Pet } from "../../types";

import {
  buildCareSchedule,
  careCompletionPercent,
  createCareLog,
} from "./engine";
import type { CareTask } from "./types";

const pet: Pet = {
  id: "luna",
  name: "Luna",
  species: "cat",
  breed: "British Shorthair",
  age: 6,
  avatar: "luna",
  color: "#999999",
  medications: [],
};

const daily: CareTask = {
  id: "breakfast",
  petId: pet.id,
  category: "feeding",
  title: "Breakfast",
  instructions: "",
  schedule: { frequency: "daily", times: ["08:00"] },
  enabled: true,
  createdAt: "2026-07-13T00:00:00.000Z",
};

describe("pet care schedule engine", () => {
  it("builds daily, weekly and one-time care on matching dates", () => {
    const monday = new Date("2026-07-13T07:00:00");
    const tasks: CareTask[] = [
      daily,
      {
        ...daily,
        id: "weekly",
        title: "Brush",
        schedule: { frequency: "weekly", times: ["18:00"], weekdays: [1] },
      },
      {
        ...daily,
        id: "once",
        title: "Vet",
        schedule: {
          frequency: "once",
          times: ["14:00"],
          date: "2026-07-13",
        },
      },
    ];
    const schedule = buildCareSchedule(tasks, [], [pet], monday, monday);
    expect(schedule.map((item) => item.task.id)).toEqual([
      "breakfast",
      "once",
      "weekly",
    ]);
  });

  it("uses one log per occurrence and reports completion", () => {
    const date = new Date("2026-07-13T07:00:00");
    const pending = buildCareSchedule([daily], [], [pet], date, date)[0];
    expect(pending?.status).toBe("upcoming");
    if (!pending) throw new Error("Expected an occurrence");
    const log = createCareLog(pending, "done", "Alex", date);
    const complete = buildCareSchedule([daily], [log], [pet], date, date);
    expect(complete[0]?.status).toBe("done");
    expect(complete[0]?.log?.completedBy).toBe("Alex");
    expect(careCompletionPercent(complete)).toBe(100);
  });

  it("marks unresolved care on earlier dates as missed", () => {
    const date = new Date("2026-07-12T12:00:00");
    const now = new Date("2026-07-13T12:00:00");
    const existingTask = {
      ...daily,
      createdAt: "2026-07-12T00:00:00.000Z",
    };
    expect(
      buildCareSchedule([existingTask], [], [pet], date, now)[0]?.status,
    ).toBe("missed");
  });
});
