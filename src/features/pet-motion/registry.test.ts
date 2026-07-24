import { describe, expect, it } from "vitest";

import {
  registerPetMotionPacks,
  resolvePetMotionPackForProfile,
} from "./registry";

registerPetMotionPacks([
  {
    version: 1,
    petKey: "breed:dog:pomeranian",
    tier: "base",
    stage: 1,
    states: { idle: 1 },
    canvas: { anchorX: 0.5, feetY: 0.8, height: 100, width: 100 },
  },
  {
    version: 1,
    petKey: "breed:dog:chihuahua",
    tier: "base",
    stage: 1,
    states: { idle: 1 },
    canvas: { anchorX: 0.5, feetY: 0.8, height: 100, width: 100 },
  },
]);

describe("pet motion breed identity", () => {
  it("returns the authored motion pack for a modeled breed", () => {
    expect(
      resolvePetMotionPackForProfile(
        "breed:dog:pomeranian",
        "dog-toy",
      )?.petKey,
    ).toBe("breed:dog:pomeranian");
  });

  it("never substitutes a different breed for an unsupported breed", () => {
    expect(
      resolvePetMotionPackForProfile("breed:dog:akita", "dog-large"),
    ).toBeNull();
    expect(
      resolvePetMotionPackForProfile("breed:cat:burmilla", "cat-compact"),
    ).toBeNull();
  });

  it("keeps profile fallback available for non-breed legacy pet keys", () => {
    expect(
      resolvePetMotionPackForProfile("pet:legacy-import", "dog-toy")?.petKey,
    ).toBe("breed:dog:chihuahua");
  });
});
