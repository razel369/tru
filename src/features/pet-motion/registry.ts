import type { PetMotionPack, PetMotionRegion } from "./types";
import type { BreedVisualProfile } from "../../types";

const packs = new Map<string, PetMotionPack>();

export function registerPetMotionPacks(nextPacks: readonly PetMotionPack[]) {
  nextPacks.forEach((pack) => packs.set(pack.petKey, pack));
}

export function resolvePetMotionPack(petKey: string) {
  return packs.get(petKey) ?? null;
}

const PROFILE_FALLBACK_PACKS: Partial<Record<BreedVisualProfile, string>> = {
  "cat-compact": "pet:luna",
  "cat-hairless": "breed:cat:sphynx",
  "cat-longhair": "breed:cat:maine-coon",
  "cat-tall": "breed:cat:siamese",
  "dog-compact": "breed:dog:beagle",
  "dog-fluffy": "breed:dog:samoyed",
  "dog-large": "breed:dog:labrador-retriever",
  "dog-long-low": "breed:dog:dachshund",
  "dog-standard": "breed:dog:labrador-retriever",
  "dog-tall": "breed:dog:great-dane",
  "dog-toy": "breed:dog:chihuahua",
};

export function resolvePetMotionPackForProfile(
  petKey: string,
  profile: BreedVisualProfile,
) {
  const exact = resolvePetMotionPack(petKey);
  if (exact) return exact;
  // A breed name must never silently become a different breed. Unsupported
  // breeds keep the neutral species artwork supplied by the screen instead
  // of borrowing another breed's animation.
  if (petKey.startsWith("breed:")) return null;
  const fallbackKey = PROFILE_FALLBACK_PACKS[profile];
  return fallbackKey ? resolvePetMotionPack(fallbackKey) : null;
}

export function getRegisteredPetMotionKeys() {
  return Array.from(packs.keys());
}

export type PetMotionBlinkAudit = {
  issues: readonly string[];
  petKey: string;
  ready: boolean;
};

function isValidEyeRegion(region: PetMotionRegion) {
  return (
    [region.x, region.y, region.width, region.height].every(Number.isFinite) &&
    region.x >= 0 &&
    region.y >= 0 &&
    region.width > 0 &&
    region.height > 0 &&
    region.x + region.width <= 1.01 &&
    region.y + region.height <= 1.01
  );
}

export function auditRegisteredPetMotionBlinks(): readonly PetMotionBlinkAudit[] {
  return Array.from(packs.values()).map((pack) => {
    const issues: string[] = [];
    const halfOverlay = pack.rig?.overlays?.blinkHalf;
    const closedOverlay = pack.rig?.overlays?.blink;
    const halfRegions = halfOverlay?.regions ?? [];
    const closedRegions = closedOverlay?.regions ?? [];

    if (!pack.states.blinkHalf) issues.push("missing half-blink frame");
    if (!pack.states.blink) issues.push("missing closed-blink frame");
    if (pack.states.blinkHalf === pack.states.blink) {
      issues.push("half and closed frames are identical");
    }
    if (halfRegions.length !== 2) {
      issues.push("half blink must isolate two eyes");
    }
    if (closedRegions.length !== 2) {
      issues.push("closed blink must isolate two eyes");
    }
    if (halfRegions.some((region) => !isValidEyeRegion(region))) {
      issues.push("half-blink eye region is outside the canvas");
    }
    if (closedRegions.some((region) => !isValidEyeRegion(region))) {
      issues.push("closed-blink eye region is outside the canvas");
    }

    return { issues, petKey: pack.petKey, ready: issues.length === 0 };
  });
}
