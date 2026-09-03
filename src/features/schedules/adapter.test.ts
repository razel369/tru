/**
 * PawPair — schedule adapter tests.
 *
 * Verifies the new engine produces the same `ScheduledDose[]`
 * shape that the prototype UI consumes.
 */

import { describe, expect, it } from "vitest";

import type { DoseLog, Pet } from "../../types";
import { buildScheduleFromEngine } from "./adapter";

const PETS: Pet[] = [
  {
    id: "milo",
    name: "Milo",
    species: "dog",
    breed: "Golden retriever",
    age: 9,
    avatar: "milo",
    color: "#F3B66D",
    medications: [
      {
        id: "carprofen",
        name: "Carprofen",
        dosage: "75 mg",
        instructions: "Give with food",
        form: "tablet",
        times: ["08:00", "20:00"],
        stock: 14,
        stockUnit: "tablets",
        color: "#ED7C62",
      },
    ],
  },
];

describe("buildScheduleFromEngine", () => {
  it("emits one dose per time per day", () => {
    const date = new Date(2026, 6, 9, 12, 0); // July 9, 2026
    const schedule = buildScheduleFromEngine(PETS, [], date);
    expect(schedule).toHaveLength(2);
    expect(schedule[0]?.scheduledTime).toBe("08:00");
    expect(schedule[1]?.scheduledTime).toBe("20:00");
  });

  it("marks past doses as 'missed' without a log", () => {
    const date = new Date(2026, 6, 9, 22, 0); // 22:00, after 20:00
    const schedule = buildScheduleFromEngine(PETS, [], date, 22 * 60);
    const eightAm = schedule.find((s) => s.scheduledTime === "08:00");
    const eightPm = schedule.find((s) => s.scheduledTime === "20:00");
    expect(eightAm?.status).toBe("missed");
    expect(eightPm?.status).toBe("missed");
  });

  it("honours existing dose logs", () => {
    const date = new Date(2026, 6, 9, 12, 0);
    const logs: DoseLog[] = [
      {
        id: "l-1",
        petId: "milo",
        medicationId: "carprofen",
        date: "2026-07-09",
        scheduledTime: "08:00",
        status: "given",
        completedAt: "2026-07-09T08:04:00.000Z",
        completedBy: "Maya",
      },
    ];
    const schedule = buildScheduleFromEngine(PETS, logs, date);
    const eightAm = schedule.find((s) => s.scheduledTime === "08:00");
    expect(eightAm?.status).toBe("given");
    expect(eightAm?.log?.completedBy).toBe("Maya");
  });
});
