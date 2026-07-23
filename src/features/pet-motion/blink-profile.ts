export type PetBlinkProfile = {
  closeMs: readonly [number, number];
  halfCloseHoldMs: number;
  closeBlendMs: number;
  closedHoldMs: readonly [number, number];
  openBlendMs: number;
  halfOpenHoldMs: number;
  openMs: readonly [number, number];
  slowBlinkChance: number;
  slowBlinkScale: number;
  doubleBlinkChance: number;
  doubleBlinkGapMs: readonly [number, number];
};

export type PetMotionClass =
  | "cat"
  | "compactDog"
  | "standardDog"
  | "largeDog";

const PROFILES = {
  cat: {
    closeMs: [68, 82],
    halfCloseHoldMs: 22,
    closeBlendMs: 28,
    closedHoldMs: [76, 92],
    openBlendMs: 31,
    halfOpenHoldMs: 21,
    openMs: [112, 132],
    slowBlinkChance: 0.14,
    slowBlinkScale: 2.05,
    doubleBlinkChance: 0.055,
    doubleBlinkGapMs: [132, 174],
  },
  compactDog: {
    closeMs: [72, 86],
    halfCloseHoldMs: 23,
    closeBlendMs: 29,
    closedHoldMs: [78, 95],
    openBlendMs: 31,
    halfOpenHoldMs: 22,
    openMs: [116, 136],
    slowBlinkChance: 0.095,
    slowBlinkScale: 1.95,
    doubleBlinkChance: 0.075,
    doubleBlinkGapMs: [118, 158],
  },
  standardDog: {
    closeMs: [76, 91],
    halfCloseHoldMs: 24,
    closeBlendMs: 30,
    closedHoldMs: [82, 99],
    openBlendMs: 33,
    halfOpenHoldMs: 23,
    openMs: [121, 142],
    slowBlinkChance: 0.1,
    slowBlinkScale: 1.92,
    doubleBlinkChance: 0.065,
    doubleBlinkGapMs: [124, 166],
  },
  largeDog: {
    closeMs: [82, 98],
    halfCloseHoldMs: 27,
    closeBlendMs: 34,
    closedHoldMs: [88, 108],
    openBlendMs: 37,
    halfOpenHoldMs: 25,
    openMs: [130, 154],
    slowBlinkChance: 0.115,
    slowBlinkScale: 1.9,
    doubleBlinkChance: 0.045,
    doubleBlinkGapMs: [138, 184],
  },
} as const satisfies Record<string, PetBlinkProfile>;

const LARGE_DOGS =
  /akita|alaskan-malamute|bernese|boxer|chow-chow|dobermann|german-shepherd|golden-retriever|great-dane|husky|labrador|malamute|mastiff|newfoundland|rottweiler|saint-bernard|samoyed|pet:milo/;
const COMPACT_DOGS =
  /bichon|boston|bulldog|cavalier|chihuahua|corgi|dachshund|french-bulldog|maltese|miniature|pekingese|pomeranian|pug|shih-tzu|toy|yorkshire/;

const PET_BLINK_OVERRIDES: Readonly<
  Record<string, Partial<PetBlinkProfile>>
> = {
  "pet:luna": {
    slowBlinkChance: 0.18,
    slowBlinkScale: 2.15,
  },
  "breed:dog:great-dane": {
    closedHoldMs: [96, 118],
    openMs: [140, 164],
  },
  "breed:dog:miniature-schnauzer": {
    closeMs: [82, 96],
    closeBlendMs: 34,
    closedHoldMs: [112, 132],
    openMs: [130, 152],
  },
  "breed:dog:pug": {
    closeMs: [68, 80],
    closedHoldMs: [82, 98],
    openMs: [112, 132],
  },
};

export function resolvePetMotionClass(
  petKey: string,
  visualProfile?: string,
): PetMotionClass {
  const normalizedKey = petKey.toLowerCase();
  const normalizedProfile = visualProfile?.toLowerCase();
  if (normalizedProfile?.startsWith("cat-")) return "cat";
  if (
    normalizedProfile === "dog-toy" ||
    normalizedProfile === "dog-compact" ||
    normalizedProfile === "dog-long-low"
  ) {
    return "compactDog";
  }
  if (
    normalizedProfile === "dog-large" ||
    normalizedProfile === "dog-tall"
  ) {
    return "largeDog";
  }
  if (normalizedProfile?.startsWith("dog-")) return "standardDog";
  if (normalizedKey.includes(":cat:") || normalizedKey === "pet:luna") {
    return "cat";
  }
  if (LARGE_DOGS.test(normalizedKey)) return "largeDog";
  if (COMPACT_DOGS.test(normalizedKey)) return "compactDog";
  return "standardDog";
}

function hashPetKey(petKey: string) {
  let hash = 2166136261;
  for (let index = 0; index < petKey.length; index += 1) {
    hash ^= petKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function scaleRange(
  range: readonly [number, number],
  scale: number,
): readonly [number, number] {
  return [Math.round(range[0] * scale), Math.round(range[1] * scale)];
}

export function resolvePetBlinkProfile(
  petKey: string,
  visualProfile?: string,
): PetBlinkProfile {
  const normalizedKey = petKey.toLowerCase();
  const base = PROFILES[resolvePetMotionClass(normalizedKey, visualProfile)];
  const resolved = {
    ...base,
    ...PET_BLINK_OVERRIDES[normalizedKey],
  } as PetBlinkProfile;
  const variation = ((hashPetKey(normalizedKey) % 13) - 6) / 100;
  const durationScale = 1 + variation;

  return {
    ...resolved,
    closeMs: scaleRange(resolved.closeMs, durationScale),
    halfCloseHoldMs: Math.round(resolved.halfCloseHoldMs * durationScale),
    closeBlendMs: Math.round(resolved.closeBlendMs * durationScale),
    closedHoldMs: scaleRange(resolved.closedHoldMs, durationScale),
    openBlendMs: Math.round(resolved.openBlendMs * durationScale),
    halfOpenHoldMs: Math.round(resolved.halfOpenHoldMs * durationScale),
    openMs: scaleRange(resolved.openMs, durationScale),
    doubleBlinkGapMs: scaleRange(resolved.doubleBlinkGapMs, durationScale),
  };
}
