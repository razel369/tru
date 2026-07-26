export type NativeMotionQASettings = {
  autoBlinkInspection: boolean;
  autoStressInteractions: boolean;
  enabled: boolean;
};

function isEnabledValue(value: unknown) {
  if (value === true || value === 1) return true;
  if (typeof value !== "string") return false;
  return ["1", "true", "yes"].includes(value.trim().toLowerCase());
}

export function resolveNativeMotionQASettings(
  settings: Readonly<Record<string, unknown>> | null | undefined,
): NativeMotionQASettings {
  return {
    autoBlinkInspection: isEnabledValue(
      settings?.PawPairMotionQABlink,
    ),
    autoStressInteractions: isEnabledValue(
      settings?.PawPairMotionQAStress,
    ),
    enabled: isEnabledValue(settings?.PawPairMotionQA),
  };
}
