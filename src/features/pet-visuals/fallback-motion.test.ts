import { describe, expect, it } from "vitest";

import { resolveFallbackPetMotionKey } from "./fallback-motion";

describe("legacy pet fallback motion", () => {
  it("keeps Luna avatar pets on Luna's motion identity", () => {
    expect(resolveFallbackPetMotionKey("luna")).toBe("pet:luna");
  });

  it("keeps every non-Luna legacy avatar on the Milo fallback shown onscreen", () => {
    expect(resolveFallbackPetMotionKey("milo")).toBe("pet:milo");
    expect(resolveFallbackPetMotionKey("legacy-dog")).toBe("pet:milo");
  });
});
