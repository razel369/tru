import { describe, expect, it } from "vitest";

import { acquirePetInteractionGate } from "./pet-interaction-gate";

describe("pet interaction gate", () => {
  it("allows only one visual response during a rapid tap burst", () => {
    let lockedUntil = 0;
    let accepted = 0;

    for (let tap = 0; tap < 1_000; tap += 1) {
      const result = acquirePetInteractionGate({
        kind: tap % 2 === 0 ? "body" : "head",
        lockedUntil,
        now: 10_000 + tap * 0.4,
        touchCooldownMs: 520,
      });
      lockedUntil = result.lockedUntil;
      if (result.accepted) accepted += 1;
    }

    expect(accepted).toBe(1);
    expect(lockedUntil).toBe(10_760);
  });

  it("accepts a new touch after the lock settles", () => {
    const first = acquirePetInteractionGate({
      kind: "head",
      lockedUntil: 0,
      now: 2_000,
      touchCooldownMs: 520,
    });
    const second = acquirePetInteractionGate({
      kind: "body",
      lockedUntil: first.lockedUntil,
      now: first.lockedUntil,
      touchCooldownMs: 520,
    });

    expect(first).toEqual({ accepted: true, lockedUntil: 2_900 });
    expect(second.accepted).toBe(true);
  });

  it("does not throttle care-completion feedback", () => {
    const result = acquirePetInteractionGate({
      kind: "care",
      lockedUntil: 5_000,
      now: 1_000,
      touchCooldownMs: 620,
    });

    expect(result).toEqual({ accepted: true, lockedUntil: 5_000 });
  });
});
