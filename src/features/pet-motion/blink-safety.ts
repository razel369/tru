import type { PetMotionFrames } from "./types";

export const DISABLED_AUTHORED_BLINK_KEYS = [] as const;

const disabledBlinkKeys = new Set<string>(DISABLED_AUTHORED_BLINK_KEYS);

export function isAuthoredBlinkEnabled(petKey: string) {
  return !disabledBlinkKeys.has(petKey);
}

export function requiresAuthoredBlinkAssets(
  states: Pick<PetMotionFrames, "blinkHalf" | "blink">,
) {
  return Boolean(states.blinkHalf || states.blink);
}
