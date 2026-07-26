import { describe, expect, it } from "vitest";

import { resolveNativeMotionQASettings } from "./native-motion-qa";

describe("native motion QA environment settings", () => {
  it.each([true, 1, "1", "true", "TRUE", "YES", " yes "])(
    "accepts the native bridge value %s",
    (value) => {
      expect(
        resolveNativeMotionQASettings({ PawPairMotionQA: value }).enabled,
      ).toBe(true);
    },
  );

  it("keeps QA disabled for ordinary App Store launches", () => {
    expect(resolveNativeMotionQASettings(undefined)).toEqual({
      autoBlinkInspection: false,
      autoStressInteractions: false,
      enabled: false,
    });
    expect(
      resolveNativeMotionQASettings({
        PawPairMotionQA: "NO",
        PawPairMotionQAStress: "false",
      }),
    ).toEqual({
      autoBlinkInspection: false,
      autoStressInteractions: false,
      enabled: false,
    });
  });

  it("requires the stress flag separately from QA mode", () => {
    expect(
      resolveNativeMotionQASettings({
        PawPairMotionQA: "YES",
        PawPairMotionQAStress: "YES",
      }),
    ).toEqual({
      autoBlinkInspection: false,
      autoStressInteractions: true,
      enabled: true,
    });
  });

  it("enables the deterministic blink inspection independently", () => {
    expect(
      resolveNativeMotionQASettings({
        PawPairMotionQA: "1",
        PawPairMotionQABlink: "1",
      }),
    ).toEqual({
      autoBlinkInspection: true,
      autoStressInteractions: false,
      enabled: true,
    });
  });
});
