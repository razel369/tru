import { describe, expect, it } from "vitest";

import { resolveNativeScreenshotQASettings } from "./native-screenshot-qa";

describe("native App Store screenshot QA settings", () => {
  it("stays disabled for ordinary launches", () => {
    expect(resolveNativeScreenshotQASettings(undefined)).toEqual({
      enabled: false,
      initialTab: "home",
      now: null,
      openPremium: false,
      openSettings: false,
    });
  });

  it("accepts only the release screenshot screens", () => {
    const settings = resolveNativeScreenshotQASettings({
      PawPairScreenshotQA: "health",
      PawPairScreenshotQANow: "2026-07-26T12:15:00.000Z",
    });
    expect(settings.enabled).toBe(true);
    expect(settings.initialTab).toBe("health");
    expect(settings.now?.toISOString()).toBe("2026-07-26T12:15:00.000Z");
  });

  it("opens settings from the Pets host tab", () => {
    expect(
      resolveNativeScreenshotQASettings({
        PawPairScreenshotQA: "settings",
      }),
    ).toMatchObject({
      enabled: true,
      initialTab: "pets",
      openPremium: false,
      openSettings: true,
    });
  });

  it("opens the App Store review paywall from the Pets host tab", () => {
    expect(
      resolveNativeScreenshotQASettings({
        PawPairScreenshotQA: "premium",
      }),
    ).toMatchObject({
      enabled: true,
      initialTab: "pets",
      openPremium: true,
      openSettings: false,
    });
  });

  it("rejects arbitrary routes and invalid dates", () => {
    expect(
      resolveNativeScreenshotQASettings({
        PawPairScreenshotQA: "paywall",
        PawPairScreenshotQANow: "not-a-date",
      }),
    ).toEqual({
      enabled: false,
      initialTab: "home",
      now: null,
      openPremium: false,
      openSettings: false,
    });
  });
});
