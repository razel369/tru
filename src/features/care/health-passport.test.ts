import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Pet } from "../../types";

import { buildUpcomingAppointments } from "./appointments";
import { buildHealthPassport, healthDueLabel } from "./health-passport";
import type { CareTask, HealthRecord } from "./types";

const pet: Pet = {
  age: 6,
  avatar: "luna",
  breed: "British Shorthair",
  color: "#999999",
  id: "pet-luna",
  medications: [],
  name: "Luna",
  species: "cat",
};

function task(id: string, overrides: Partial<CareTask> = {}): CareTask {
  return {
    category: "appointment",
    createdAt: "2026-07-01T00:00:00.000Z",
    enabled: true,
    id,
    instructions: "",
    petId: pet.id,
    schedule: { date: "2026-07-20", frequency: "once", times: ["09:00"] },
    title: `Task ${id}`,
    ...overrides,
  };
}

function record(id: string, overrides: Partial<HealthRecord> = {}): HealthRecord {
  return {
    createdAt: "2026-07-01T00:00:00.000Z",
    date: "2026-07-01",
    id,
    petId: pet.id,
    title: id,
    type: "note",
    ...overrides,
  };
}

describe("health passport calculations", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deduplicates vaccine boosters and classifies due dates by calendar day", () => {
    const records = [
      record("rabies-old", {
        date: "2025-07-01",
        nextDueDate: "2026-07-01",
        title: "Rabies vaccine dose 1",
        type: "vaccination",
      }),
      record("rabies-new", {
        date: "2026-07-10",
        nextDueDate: "2026-08-01",
        title: "Rabies booster 2nd",
        type: "vaccination",
      }),
      record("distemper", {
        date: "2025-06-01",
        nextDueDate: "2026-07-18",
        title: "Distemper vaccination",
        type: "vaccination",
      }),
    ];

    const passport = buildHealthPassport(pet, [], records);

    expect(passport.vaccineCount).toBe(2);
    expect(passport.dueSoonVaccines).toBe(1);
    expect(passport.overdueVaccines).toBe(1);
    expect(passport.passportLabel).toBe("Action needed");
    expect(healthDueLabel(records[1]!)).toBe("Due in 13d");
    expect(healthDueLabel(records[2]!)).toBe("1d overdue");
  });

  it("calculates weight deltas only from strict numbers with matching units", () => {
    const valid = buildHealthPassport(pet, [], [
      record("latest", {
        date: "2026-07-10",
        title: "Weight",
        type: "weight",
        unit: " KG ",
        value: "4,5",
      }),
      record("previous", {
        date: "2026-07-01",
        title: "Weight",
        type: "weight",
        unit: "kg",
        value: "4.0",
      }),
    ]);
    const malformed = buildHealthPassport(pet, [], [
      record("latest-bad", {
        date: "2026-07-10",
        title: "Weight",
        type: "weight",
        unit: "kg",
        value: "4kg",
      }),
      record("previous-good", {
        date: "2026-07-01",
        title: "Weight",
        type: "weight",
        unit: "kg",
        value: "4",
      }),
    ]);

    expect(valid.latestWeightDelta).toBeCloseTo(0.5);
    expect(malformed.latestWeightDelta).toBeUndefined();
  });

  it("finds the actual date of recurring weekly appointments", () => {
    const weekly = task("therapy", {
      schedule: { frequency: "weekly", times: ["09:00"], weekdays: [1] },
      title: "Weekly therapy",
    });

    const passport = buildHealthPassport(pet, [weekly], []);

    expect(passport.nextAppointment?.id).toBe("therapy");
    expect(passport.nextAppointmentDate).toBe("2026-07-20");
  });

  it("does not surface appointments for pets missing from the supplied family", () => {
    const orphan = task("orphan", { petId: "missing-pet" });

    expect(
      buildUpcomingAppointments([orphan], [pet], new Date("2026-07-19T12:00:00")),
    ).toEqual([]);
  });
});
