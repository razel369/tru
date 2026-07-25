import type { PetMotionFrames } from "./types";

export const DISABLED_AUTHORED_BLINK_KEYS = [
  "breed:cat:abyssinian",
  "breed:cat:bengal",
  "breed:cat:devon-rex",
  "breed:cat:maine-coon",
  "breed:cat:munchkin",
  "breed:cat:persian",
  "breed:dog:bulldog",
  "breed:dog:chihuahua",
  "breed:dog:havanese",
  "breed:dog:pug",
  "breed:dog:shih-tzu",
  "breed:dog:yorkshire-terrier",
] as const;

const disabledBlinkKeys = new Set<string>(DISABLED_AUTHORED_BLINK_KEYS);

export function isAuthoredBlinkEnabled(petKey: string) {
  return !disabledBlinkKeys.has(petKey);
}

export function requiresAuthoredBlinkAssets(
  states: Pick<PetMotionFrames, "blinkHalf" | "blink">,
) {
  return Boolean(states.blinkHalf || states.blink);
}
