import { describe, expect, it } from "vitest";

import type { Pet } from "../../types";

import { buildMedicationSupplyStatuses } from "./medication-supply";
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

function medication(
  id: string,
  overrides: Partial<CareTask> = {},
): CareTask {
  return {
    category: "medication",
    createdAt: "2026-07-01T00:00:00.000Z",
    details: {
      refillThreshold: 5,
      stock: 14,
      stockUnit: "tablets",
      unitsPerDose: 1,
    },
    enabled: true,
    id,
    instructions: "",
    petId: pet.id,
    schedule: { frequency: "daily", times: ["08:00"] },
    title: `Medication ${id}`,
    ...overrides,
  };
}

describe("medication supply forecasts", () => {
  it("deduplicates repeated times and weekdays", () => {
    const [status] = buildMedicationSupplyStatuses(
      [
        medication("weekly", {
          schedule: {
            frequency: "weekly",
            times: ["08:00", "08:00"],
            weekdays: [1, 1],
          },
        }),
      ],
      [pet],
    );

    expect(status?.daysRemaining).toBe(98);
  });

  it("ignores invalid times and orphaned medication tasks", () => {
    const statuses = buildMedicationSupplyStatuses(
      [
        medication("valid", {
          schedule: { frequency: "daily", times: ["08:00", "invalid"] },
        }),
        medication("orphan", { petId: "missing-pet" }),
      ],
      [pet],
    );

    expect(statuses).toHaveLength(1);
    expect(statuses[0]?.task.id).toBe("valid");
    expect(statuses[0]?.daysRemaining).toBe(14);
  });

  it("prioritizes out, critical, and low supply in that order", () => {
    const statuses = buildMedicationSupplyStatuses(
      [
        medication("healthy", { details: { stock: 30, unitsPerDose: 1 } }),
        medication("low", { details: { stock: 7, unitsPerDose: 1 } }),
        medication("critical", { details: { stock: 2, unitsPerDose: 1 } }),
        medication("out", { details: { stock: 0.5, unitsPerDose: 1 } }),
      ],
      [pet],
    );

    expect(statuses.map((status) => status.severity)).toEqual([
      "out",
      "critical",
      "low",
      "healthy",
    ]);
  });
});
