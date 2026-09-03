import { describe, expect, it } from "vitest";

import { PET_SUBJECT_FRAMING_KEYS } from "./subject-framing.generated";
import { resolvePetStagePlacement } from "./subject-framing";

describe("pet stage placement", () => {
  it("centers and floor-aligns every shipped pet motion pack", () => {
    expect(PET_SUBJECT_FRAMING_KEYS.length).toBeGreaterThanOrEqual(67);

    for (const key of PET_SUBJECT_FRAMING_KEYS) {
      const targetCenterX = 0.5;
      const targetFeetY = 0.94;
      const targetSubjectHeight = 0.78;
      const placement = resolvePetStagePlacement(key, {
        maxScale: 2.5,
        minScale: 0.5,
        targetCenterX,
        targetFeetY,
        targetSubjectHeight,
      });
      const renderedCenterX =
        0.5 +
        placement.scale * (placement.framing.centerX - 0.5) +
        placement.translateXRatio;
      const renderedFeetY =
        0.5 +
        placement.scale * (placement.framing.feetY - 0.5) +
        placement.translateYRatio;
      const renderedSubjectHeight =
        placement.framing.subjectHeight * placement.scale;

      expect(renderedCenterX, `${key} center`).toBeCloseTo(targetCenterX, 8);
      expect(renderedFeetY, `${key} feet`).toBeCloseTo(targetFeetY, 8);
      expect(renderedSubjectHeight, `${key} height`).toBeCloseTo(
        targetSubjectHeight,
        8,
      );
      expect(Number.isFinite(placement.translateXRatio), `${key} x`).toBe(
        true,
      );
      expect(Number.isFinite(placement.translateYRatio), `${key} y`).toBe(
        true,
      );
    }
  });

  it("keeps the default framing safe for an unknown companion", () => {
    const placement = resolvePetStagePlacement("breed:other:unknown");

    expect(placement.scale).toBeGreaterThan(0);
    expect(placement.translateXRatio).toBe(0);
    expect(Number.isFinite(placement.translateYRatio)).toBe(true);
  });
});
