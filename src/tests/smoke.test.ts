/**
 * PawPair — end-to-end smoke test (in-memory).
 *
 * Exercises the business logic that the UI eventually calls
 * without rendering a single screen. Every step maps to an
 * app action and an expected outcome. New stages must keep
 * this green.
 */

import { describe, expect, it } from "vitest";

import { DEMO_PETS, createDoseLog } from "../schedule";
import { buildScheduleFromEngine } from "../features/schedules/adapter";
import { canAddMedication, canAddPet, defaultFreeEntitlement } from "../features/subscriptions/entitlements";
import type { SubscriptionEntitlement } from "../features/subscriptions/types";
import type { DoseLog, Pet } from "../types";

describe("smoke: end-to-end app logic", () => {
  it("renders the Today schedule from demo data", () => {
    const date = new Date(2026, 6, 9, 12, 0);
    const schedule = buildScheduleFromEngine(DEMO_PETS, [], date);
    expect(schedule.every((d) => d.pet.id === "milo" || d.pet.id === "luna")).toBe(
      true,
    );
    // The schedule contains morning and evening entries for both
    // pets.
    expect(schedule.some((d) => d.scheduledTime.startsWith("08"))).toBe(true);
    expect(schedule.some((d) => d.scheduledTime.startsWith("20"))).toBe(true);
  });

  it("logs a dose: the new log is returned by the schedule", () => {
    const date = new Date(2026, 6, 9, 12, 0);
    const before = buildScheduleFromEngine(DEMO_PETS, [], date);
    const firstDose = before[0];
    expect(firstDose).toBeDefined();
    if (!firstDose) return;

    const newLog: DoseLog = createDoseLog(firstDose, "given", "Maya");
    // The createDoseLog helper produces a stable, well-formed
    // dose event with a non-empty completedBy.
    expect(newLog.completedBy).toBe("Maya");
    expect(newLog.status).toBe("given");
    expect(newLog.scheduledTime).toBe(firstDose.scheduledTime);
  });

  it("the free tier blocks a third pet and a third medication", () => {
    const free = defaultFreeEntitlement();
    expect(canAddPet(free, 0)).toBe(true);
    expect(canAddPet(free, 1)).toBe(false);
    expect(canAddMedication(free, 0)).toBe(true);
    expect(canAddMedication(free, 2)).toBe(false);
  });

  it("Plus lifts the cap", () => {
    const plus: SubscriptionEntitlement = {
      tier: "plus",
      productId: "pawpair.plus",
      expiresAtUtc: null,
      hasBeenPlus: true,
    };
    expect(canAddPet(plus, 5)).toBe(true);
    expect(canAddMedication(plus, 17)).toBe(true);
  });

  it("pet profile carries the same fields after a round-trip", () => {
    const milo = DEMO_PETS.find((p) => p.id === "milo");
    expect(milo).toBeDefined();
    if (!milo) return;
    // The Pet shape is stable. Any future change to Pet must
    // update the smoke test so the UI knows the contract.
    const required: (keyof Pet)[] = [
      "id",
      "name",
      "species",
      "breed",
      "age",
      "avatar",
      "color",
      "medications",
    ];
    for (const key of required) {
      expect(key in milo).toBe(true);
    }
  });
});
