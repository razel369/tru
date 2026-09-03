import { describe, expect, it } from "vitest";

import { inventoryUnitsFromPlan, inventoryUnitsUsed } from "./inventory-delta";

describe("medication inventory deltas", () => {
  it("uses only the stock that is actually available", () => {
    expect(inventoryUnitsUsed([0.5], 1)).toBe(0.5);
    expect(inventoryUnitsUsed([0], 1)).toBe(0);
    expect(inventoryUnitsUsed([10], 2)).toBe(2);
  });

  it("uses the most conservative stock when linked sources disagree", () => {
    expect(inventoryUnitsUsed([10, 3], 5)).toBe(3);
  });

  it("restores the exact amount captured by the completion snapshot", () => {
    expect(inventoryUnitsFromPlan({ stock: 0.5, unitsPerDose: 1 }, 1)).toBe(
      0.5,
    );
    expect(inventoryUnitsFromPlan({ stock: 0, unitsPerDose: 1 }, 1)).toBe(0);
  });

  it("keeps legacy logs reversible when no stock snapshot exists", () => {
    expect(inventoryUnitsFromPlan(undefined, 2)).toBe(2);
  });
});
