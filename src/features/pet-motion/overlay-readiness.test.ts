import { describe, expect, it } from "vitest";

import {
  createPetMotionOverlayReadiness,
  isPetMotionOverlayReady,
  recordPetMotionOverlayLoad,
} from "./overlay-readiness";

describe("paired-eye overlay readiness", () => {
  it("waits for both eyes in both authored blink frames", () => {
    let readiness = createPetMotionOverlayReadiness("pack-a", {
      blink: 2,
      blinkHalf: 2,
    });

    for (const [state, index] of [
      ["blinkHalf", 0],
      ["blink", 1],
      ["blinkHalf", 1],
    ] as const) {
      const result = recordPetMotionOverlayLoad(readiness, {
        index,
        packKey: "pack-a",
        state,
        succeeded: true,
      });
      readiness = result.readiness;
      expect(result.status).toBe("waiting");
      expect(isPetMotionOverlayReady(readiness)).toBe(false);
    }

    const final = recordPetMotionOverlayLoad(readiness, {
      index: 0,
      packKey: "pack-a",
      state: "blink",
      succeeded: true,
    });

    expect(final.status).toBe("ready");
    expect(isPetMotionOverlayReady(final.readiness)).toBe(true);
  });

  it("never treats an image error as a ready eye", () => {
    const readiness = createPetMotionOverlayReadiness("pack-a", {
      blink: 2,
      blinkHalf: 2,
    });
    const result = recordPetMotionOverlayLoad(readiness, {
      index: 0,
      packKey: "pack-a",
      state: "blink",
      succeeded: false,
    });

    expect(result.status).toBe("failed");
    expect(result.readiness.failed).toBe(true);
    expect(isPetMotionOverlayReady(result.readiness)).toBe(false);
  });

  it("ignores late load events from a previous pet", () => {
    const readiness = createPetMotionOverlayReadiness("pack-b", {
      blink: 2,
      blinkHalf: 2,
    });
    const result = recordPetMotionOverlayLoad(readiness, {
      index: 0,
      packKey: "pack-a",
      state: "blinkHalf",
      succeeded: true,
    });

    expect(result.status).toBe("stale");
    expect(result.readiness).toBe(readiness);
  });

  it("is idempotent when React Native repeats an onLoad event", () => {
    let readiness = createPetMotionOverlayReadiness("pack-a", {
      blink: 1,
      blinkHalf: 1,
    });
    const half = recordPetMotionOverlayLoad(readiness, {
      index: 0,
      packKey: "pack-a",
      state: "blinkHalf",
      succeeded: true,
    });
    readiness = half.readiness;

    for (let count = 0; count < 100; count += 1) {
      readiness = recordPetMotionOverlayLoad(readiness, {
        index: 0,
        packKey: "pack-a",
        state: "blinkHalf",
        succeeded: true,
      }).readiness;
    }

    expect(readiness.loaded.blinkHalf.size).toBe(1);
    expect(isPetMotionOverlayReady(readiness)).toBe(false);
  });
});
