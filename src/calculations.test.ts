import { describe, expect, it } from "vitest";

import {
  convertInputs,
  DEFAULT_INPUTS,
  simulateTank,
  validateInputs,
} from "./calculations";

describe("rainwater simulation", () => {
  it("captures one litre per square metre per millimetre before losses", () => {
    const result = simulateTank({
      ...DEFAULT_INPUTS,
      roofArea: 100,
      roofMaterial: "metal",
      tankCapacity: 100_000,
      dailyDemand: 0,
      startingFillPercent: 0,
      rainfall: [10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });

    expect(result.annualCaptured).toBeCloseTo(900, 5);
    expect(result.months[0]?.endingStorage).toBeCloseTo(900, 5);
  });

  it("tracks overflow, shortage, and annual reliability", () => {
    const result = simulateTank({
      ...DEFAULT_INPUTS,
      roofArea: 100,
      roofMaterial: "metal",
      tankCapacity: 500,
      dailyDemand: 100,
      startingFillPercent: 0,
      rainfall: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });

    expect(result.annualOverflow).toBeGreaterThan(0);
    expect(result.annualShortage).toBeGreaterThan(0);
    expect(result.reliability).toBeGreaterThanOrEqual(0);
    expect(result.reliability).toBeLessThan(100);
  });

  it("round-trips between metric and imperial units", () => {
    const imperial = convertInputs(DEFAULT_INPUTS, "imperial");
    const metric = convertInputs(imperial, "metric");

    expect(metric.roofArea).toBeCloseTo(DEFAULT_INPUTS.roofArea, 6);
    expect(metric.tankCapacity).toBeCloseTo(DEFAULT_INPUTS.tankCapacity, 6);
    expect(metric.dailyDemand).toBeCloseTo(DEFAULT_INPUTS.dailyDemand, 6);
    expect(metric.rainfall[0]).toBeCloseTo(DEFAULT_INPUTS.rainfall[0]!, 6);
  });

  it("rejects incomplete or impossible values", () => {
    const errors = validateInputs({
      ...DEFAULT_INPUTS,
      name: "",
      roofArea: 0,
      rainfall: [1, 2],
    });

    expect(errors).toHaveLength(3);
  });
});
