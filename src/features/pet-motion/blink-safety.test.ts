import { describe, expect, it } from "vitest";

import {
  DISABLED_AUTHORED_BLINK_KEYS,
  isAuthoredBlinkEnabled,
  requiresAuthoredBlinkAssets,
} from "./blink-safety";

describe("authored blink release safety", () => {
  it("keeps no exact pet portrait static after blink-frame repair", () => {
    expect(DISABLED_AUTHORED_BLINK_KEYS).toHaveLength(0);
  });

  it("keeps visually audited and repaired blink packs enabled", () => {
    [
      "pet:luna",
      "breed:cat:russian-blue",
      "breed:dog:miniature-schnauzer",
      "breed:dog:pembroke-welsh-corgi",
      "breed:cat:maine-coon",
      "breed:dog:chihuahua",
    ].forEach((key) => {
      expect(isAuthoredBlinkEnabled(key), key).toBe(true);
    });
  });

  it("treats static-safe packs as ready without waiting for absent blink assets", () => {
    expect(requiresAuthoredBlinkAssets({})).toBe(false);
    expect(requiresAuthoredBlinkAssets({ blinkHalf: { uri: "half.png" } })).toBe(
      true,
    );
    expect(requiresAuthoredBlinkAssets({ blink: { uri: "blink.png" } })).toBe(
      true,
    );
  });
});
