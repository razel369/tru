import { describe, expect, it } from "vitest";

import {
  blockedActions,
  canAddMedication,
  canAddPet,
  canPerform,
  defaultFreeEntitlement,
  isPlus,
} from "./entitlements";
import type { SubscriptionEntitlement } from "./types";

const plus: SubscriptionEntitlement = {
  tier: "plus",
  productId: "app.pawpair.plus.monthly",
  expiresAtUtc: "2026-08-10T00:00:00.000Z",
  hasBeenPlus: true,
};

const free: SubscriptionEntitlement = defaultFreeEntitlement();

describe("entitlements", () => {
  it("isPlus returns true only for the plus tier", () => {
    expect(isPlus(plus)).toBe(true);
    expect(isPlus(free)).toBe(false);
  });

  it("canAddPet blocks at 1 on free, unlimited on plus", () => {
    expect(canAddPet(free, 0)).toBe(true);
    expect(canAddPet(free, 1)).toBe(false);
    expect(canAddPet(plus, 7)).toBe(true);
  });

  it("canAddMedication blocks at 2 on free, unlimited on plus", () => {
    expect(canAddMedication(free, 0)).toBe(true);
    expect(canAddMedication(free, 1)).toBe(true);
    expect(canAddMedication(free, 2)).toBe(false);
    expect(canAddMedication(plus, 17)).toBe(true);
  });

  it("canPerform is true on plus and false on free for every gated action", () => {
    for (const action of [
      "addPet",
      "addMedication",
      "householdSync",
      "report",
      "refillForecast",
      "backup",
    ] as const) {
      expect(canPerform(free, action)).toBe(false);
      expect(canPerform(plus, action)).toBe(true);
    }
  });

  it("blockedActions lists every gated action on free, none on plus", () => {
    expect(blockedActions(free)).toHaveLength(6);
    expect(blockedActions(plus)).toEqual([]);
  });
});
