import type { CareTab } from "./CareBottomNav";

const SCREENSHOT_TABS = new Set<CareTab>([
  "home",
  "plan",
  "health",
  "pets",
]);

export type NativeScreenshotQASettings = {
  enabled: boolean;
  initialTab: CareTab;
  now: Date | null;
  openSettings: boolean;
};

function validNow(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function resolveNativeScreenshotQASettings(
  settings: Readonly<Record<string, unknown>> | null | undefined,
): NativeScreenshotQASettings {
  const requestedScreen =
    typeof settings?.PawPairScreenshotQA === "string"
      ? settings.PawPairScreenshotQA.trim().toLowerCase()
      : "";
  const openSettings = requestedScreen === "settings";
  const initialTab = SCREENSHOT_TABS.has(requestedScreen as CareTab)
    ? (requestedScreen as CareTab)
    : openSettings
      ? "pets"
      : "home";

  return {
    enabled: SCREENSHOT_TABS.has(requestedScreen as CareTab) || openSettings,
    initialTab,
    now: validNow(settings?.PawPairScreenshotQANow),
    openSettings,
  };
}
