import { describe, expect, it } from "vitest";

import {
  DISABLED_AUTHORED_BLINK_KEYS,
  isAuthoredBlinkEnabled,
  requiresAuthoredBlinkAssets,
} from "./blink-safety";

describe("authored blink release safety", () => {
  it("keeps every known seam-risk portrait on a stable idle frame", () => {
    expect([...DISABLED_AUTHORED_BLINK_KEYS].sort()).toEqual(
      [
        "breed:cat:abyssinian",
        "breed:cat:bengal",
        "breed:cat:birman",
        "breed:cat:devon-rex",
        "breed:cat:maine-coon",
        "breed:cat:munchkin",
        "breed:cat:norwegian-forest-cat",
        "breed:cat:persian",
        "breed:dog:australian-shepherd",
        "breed:dog:bulldog",
        "breed:dog:cavalier-king-charles-spaniel",
        "breed:dog:chihuahua",
        "breed:dog:havanese",
        "breed:dog:pug",
        "breed:dog:shih-tzu",
        "breed:dog:yorkshire-terrier",
      ].sort(),
    );
    DISABLED_AUTHORED_BLINK_KEYS.forEach((key) => {
      expect(isAuthoredBlinkEnabled(key), key).toBe(false);
    });
  });

  it("keeps visually audited blink packs enabled", () => {
    [
      "pet:luna",
      "breed:cat:russian-blue",
      "breed:dog:miniature-schnauzer",
      "breed:dog:pembroke-welsh-corgi",
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
