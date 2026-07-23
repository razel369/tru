import { describe, expect, it } from "vitest";

import type { Pet } from "../../types";

import { buildCareInsights } from "./care-insights";
import type { CareLog, CareTask } from "./types";

const pet: Pet = {
  age: 4,
  avatar: "milo",
  breed: "Great Dane",
  color: "#999999",
  id: "pet-atlas",
  medications: [],
  name: "Atlas",
  species: "dog",
};

function task(id: string, overrides: Partial<CareTask> = {}): CareTask {
  return {
    category: "walk",
    createdAt: "2026-07-01T00:00:00.000Z",
    details: { durationMinutes: 30 },
    enabled: true,
    id,
    instructions: "",
    petId: pet.id,
    schedule: { frequency: "daily", times: ["08:00"] },
    title: `Task ${id}`,
    ...overrides,
  };
}

function log(
  id: string,
  status: CareLog["status"],
  completedAt: string,
  actualMinutes?: number,
): CareLog {
  return {
    completedAt,
    completedBy: "You",
    date: "2026-07-18",
    id,
    petId: pet.id,
    scheduledTime: "08:00",
    status,
    taskId: "walk",
    ...(actualMinutes === undefined
      ? {}
      : { actual: { durationMinutes: actualMinutes } }),
  };
}

describe("care insights", () => {
  it("uses only the latest log version for activity minutes", () => {
    const insights = buildCareInsights(
      [task("walk")],
      [
        log("old", "done", "2026-07-18T08:30:00.000Z", 30),
        log("new", "done", "2026-07-18T09:00:00.000Z", 45),
      ],
      [pet],
      new Date("2026-07-19T12:00:00"),
    );

    expect(insights.activityMinutes).toBe(45);
  });

  it("does not count an older completion when the latest status is skipped", () => {
    const insights = buildCareInsights(
      [task("walk")],
      [
        log("old", "done", "2026-07-18T08:30:00.000Z", 30),
        log("new", "skipped", "2026-07-18T09:00:00.000Z"),
      ],
      [pet],
      new Date("2026-07-19T12:00:00"),
    );

    expect(insights.activityMinutes).toBe(0);
  });

  it("excludes future moments today from adherence and attention", () => {
    const insights = buildCareInsights(
      [
        task("morning", { schedule: { frequency: "daily", times: ["08:00"] } }),
        task("evening", { schedule: { frequency: "daily", times: ["20:00"] } }),
      ],
      [],
      [pet],
      new Date("2026-07-19T12:00:00"),
      1,
    );

    expect(insights.planned).toBe(1);
    expect(insights.attentionCount).toBe(1);
    expect(insights.days[0]?.missed).toBe(1);
  });
});
