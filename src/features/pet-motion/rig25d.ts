import { resolvePetEngraving } from "./engraving-registry";
import { GENERATED_EXACT_BREED_PACKS } from "./exact-breed-packs";

export type PetRig25DRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PetRig25DEye = PetRig25DRegion & {
  sampleOffsetY: number;
};

export type PetRig25DProfile = {
  id: string;
  head: PetRig25DRegion;
  eyes: readonly [PetRig25DEye, PetRig25DEye];
  leftEar?: PetRig25DRegion;
  rightEar?: PetRig25DRegion;
  chest: PetRig25DRegion;
  tag?: PetRig25DRegion;
  engraving?: PetRig25DRegion;
  shadow: {
    x: number;
    width: number;
    height: number;
    overlap: number;
    pawContacts: readonly { x: number; width: number }[];
  };
  motion: {
    attention: number;
    chestLift: number;
    chestScaleX: number;
    chestScaleY: number;
    earTwitchDeg: number;
    headLife: number;
    headRotateDeg: number;
    headScale: number;
    headTranslateX: number;
    headTranslateY: number;
    headYawDeg: number;
    tagSwingDeg: number;
  };
};

const COMMON_MOTION: PetRig25DProfile["motion"] = {
  attention: 1,
  chestLift: 0.58,
  chestScaleX: 1.0035,
  chestScaleY: 1.0055,
  earTwitchDeg: 2,
  headLife: 0.64,
  headRotateDeg: 0.5,
  headScale: 1.004,
  headTranslateX: 0.95,
  headTranslateY: 0.72,
  headYawDeg: 0.58,
  tagSwingDeg: 2.2,
};

const CAT_COMPACT: PetRig25DProfile = {
  id: "cat-compact",
  head: { x: 0.17, y: 0.175, width: 0.66, height: 0.31 },
  eyes: [
    { x: 0.345, y: 0.292, width: 0.135, height: 0.076, sampleOffsetY: 0.032 },
    { x: 0.525, y: 0.292, width: 0.135, height: 0.076, sampleOffsetY: 0.032 },
  ],
  leftEar: { x: 0.235, y: 0.18, width: 0.235, height: 0.17 },
  rightEar: { x: 0.545, y: 0.195, width: 0.225, height: 0.165 },
  chest: { x: 0.255, y: 0.42, width: 0.49, height: 0.235 },
  engraving: { x: 0.43, y: 0.445, width: 0.14, height: 0.045 },
  shadow: {
    x: 0.205,
    width: 0.59,
    height: 0.016,
    overlap: 0.007,
    pawContacts: [
      { x: 0.11, width: 0.16 },
      { x: 0.31, width: 0.15 },
      { x: 0.52, width: 0.14 },
      { x: 0.72, width: 0.16 },
    ],
  },
  motion: { ...COMMON_MOTION, attention: 1.08, headLife: 0.72 },
};

const CAT_TALL: PetRig25DProfile = {
  ...CAT_COMPACT,
  id: "cat-tall",
  head: { x: 0.2, y: 0.17, width: 0.6, height: 0.29 },
  eyes: [
    { x: 0.35, y: 0.245, width: 0.13, height: 0.07, sampleOffsetY: 0.03 },
    { x: 0.525, y: 0.245, width: 0.13, height: 0.07, sampleOffsetY: 0.03 },
  ],
  leftEar: { x: 0.235, y: 0.16, width: 0.22, height: 0.17 },
  rightEar: { x: 0.55, y: 0.17, width: 0.215, height: 0.17 },
  chest: { x: 0.28, y: 0.395, width: 0.44, height: 0.285 },
  engraving: { x: 0.44, y: 0.42, width: 0.12, height: 0.045 },
  shadow: { ...CAT_COMPACT.shadow, x: 0.23, width: 0.54 },
  motion: {
    ...COMMON_MOTION,
    attention: 1.14,
    earTwitchDeg: 2.5,
    headRotateDeg: 0.42,
  },
};

const CAT_LONGHAIR: PetRig25DProfile = {
  ...CAT_COMPACT,
  id: "cat-longhair",
  head: { x: 0.15, y: 0.17, width: 0.7, height: 0.335 },
  eyes: [
    { x: 0.34, y: 0.285, width: 0.14, height: 0.078, sampleOffsetY: 0.034 },
    { x: 0.525, y: 0.285, width: 0.14, height: 0.078, sampleOffsetY: 0.034 },
  ],
  leftEar: { x: 0.205, y: 0.17, width: 0.25, height: 0.18 },
  rightEar: { x: 0.55, y: 0.18, width: 0.245, height: 0.18 },
  chest: { x: 0.2, y: 0.41, width: 0.6, height: 0.275 },
  engraving: { x: 0.43, y: 0.455, width: 0.14, height: 0.045 },
  shadow: { ...CAT_COMPACT.shadow, x: 0.18, width: 0.64 },
  motion: {
    ...COMMON_MOTION,
    chestScaleX: 1.0025,
    chestScaleY: 1.004,
    headTranslateX: 0.78,
  },
};

const DOG_STANDARD: PetRig25DProfile = {
  id: "dog-standard",
  head: { x: 0.19, y: 0.17, width: 0.62, height: 0.32 },
  eyes: [
    { x: 0.34, y: 0.255, width: 0.14, height: 0.072, sampleOffsetY: 0.032 },
    { x: 0.525, y: 0.255, width: 0.14, height: 0.072, sampleOffsetY: 0.032 },
  ],
  leftEar: { x: 0.2, y: 0.18, width: 0.245, height: 0.19 },
  rightEar: { x: 0.555, y: 0.18, width: 0.245, height: 0.19 },
  chest: { x: 0.25, y: 0.42, width: 0.5, height: 0.285 },
  engraving: { x: 0.43, y: 0.435, width: 0.14, height: 0.05 },
  shadow: {
    x: 0.2,
    width: 0.6,
    height: 0.016,
    overlap: 0.007,
    pawContacts: [
      { x: 0.1, width: 0.18 },
      { x: 0.32, width: 0.16 },
      { x: 0.53, width: 0.16 },
      { x: 0.74, width: 0.16 },
    ],
  },
  motion: { ...COMMON_MOTION, earTwitchDeg: 1.45 },
};

const DOG_TOY: PetRig25DProfile = {
  ...DOG_STANDARD,
  id: "dog-toy",
  head: { x: 0.16, y: 0.19, width: 0.68, height: 0.33 },
  eyes: [
    { x: 0.325, y: 0.295, width: 0.155, height: 0.085, sampleOffsetY: 0.038 },
    { x: 0.525, y: 0.295, width: 0.155, height: 0.085, sampleOffsetY: 0.038 },
  ],
  leftEar: { x: 0.18, y: 0.17, width: 0.27, height: 0.21 },
  rightEar: { x: 0.55, y: 0.17, width: 0.27, height: 0.21 },
  chest: { x: 0.255, y: 0.44, width: 0.49, height: 0.245 },
  engraving: { x: 0.42, y: 0.46, width: 0.16, height: 0.055 },
  shadow: { ...DOG_STANDARD.shadow, x: 0.23, width: 0.54 },
  motion: {
    ...COMMON_MOTION,
    attention: 1.18,
    earTwitchDeg: 2.65,
    headRotateDeg: 0.64,
    headTranslateX: 1.08,
  },
};

const DOG_COMPACT: PetRig25DProfile = {
  ...DOG_STANDARD,
  id: "dog-compact",
  head: { x: 0.16, y: 0.205, width: 0.68, height: 0.32 },
  eyes: [
    { x: 0.325, y: 0.3, width: 0.15, height: 0.082, sampleOffsetY: 0.036 },
    { x: 0.53, y: 0.3, width: 0.15, height: 0.082, sampleOffsetY: 0.036 },
  ],
  leftEar: { x: 0.19, y: 0.18, width: 0.255, height: 0.2 },
  rightEar: { x: 0.555, y: 0.18, width: 0.255, height: 0.2 },
  chest: { x: 0.22, y: 0.45, width: 0.56, height: 0.235 },
  engraving: { x: 0.42, y: 0.455, width: 0.16, height: 0.055 },
  shadow: { ...DOG_STANDARD.shadow, x: 0.17, width: 0.66 },
  motion: {
    ...COMMON_MOTION,
    chestScaleY: 1.0045,
    earTwitchDeg: 1.15,
    headTranslateX: 0.76,
  },
};

const DOG_LARGE: PetRig25DProfile = {
  ...DOG_STANDARD,
  id: "dog-large",
  head: { x: 0.2, y: 0.15, width: 0.6, height: 0.3 },
  eyes: [
    { x: 0.35, y: 0.235, width: 0.13, height: 0.07, sampleOffsetY: 0.031 },
    { x: 0.525, y: 0.235, width: 0.13, height: 0.07, sampleOffsetY: 0.031 },
  ],
  chest: { x: 0.22, y: 0.39, width: 0.56, height: 0.34 },
  engraving: { x: 0.43, y: 0.455, width: 0.14, height: 0.04 },
  shadow: { ...DOG_STANDARD.shadow, x: 0.16, width: 0.68 },
  motion: {
    ...COMMON_MOTION,
    attention: 0.86,
    chestScaleY: 1.004,
    earTwitchDeg: 1.1,
    headLife: 0.48,
    headTranslateX: 0.72,
  },
};

const DOG_TALL: PetRig25DProfile = {
  ...DOG_LARGE,
  id: "dog-tall",
  head: { x: 0.235, y: 0.115, width: 0.53, height: 0.26 },
  eyes: [
    { x: 0.36, y: 0.2, width: 0.12, height: 0.064, sampleOffsetY: 0.027 },
    { x: 0.52, y: 0.2, width: 0.12, height: 0.064, sampleOffsetY: 0.027 },
  ],
  leftEar: { x: 0.25, y: 0.11, width: 0.21, height: 0.17 },
  rightEar: { x: 0.54, y: 0.11, width: 0.21, height: 0.17 },
  chest: { x: 0.275, y: 0.32, width: 0.45, height: 0.41 },
  engraving: { x: 0.44, y: 0.35, width: 0.12, height: 0.04 },
  shadow: { ...DOG_STANDARD.shadow, x: 0.22, width: 0.56 },
  motion: {
    ...DOG_LARGE.motion,
    headRotateDeg: 0.34,
    headTranslateY: 0.55,
  },
};

const DOG_LONG_LOW: PetRig25DProfile = {
  ...DOG_COMPACT,
  id: "dog-long-low",
  head: { x: 0.17, y: 0.22, width: 0.66, height: 0.3 },
  eyes: [
    { x: 0.33, y: 0.29, width: 0.15, height: 0.08, sampleOffsetY: 0.035 },
    { x: 0.525, y: 0.29, width: 0.15, height: 0.08, sampleOffsetY: 0.035 },
  ],
  chest: { x: 0.18, y: 0.45, width: 0.64, height: 0.235 },
  engraving: { x: 0.42, y: 0.46, width: 0.16, height: 0.055 },
  shadow: { ...DOG_STANDARD.shadow, x: 0.11, width: 0.78 },
  motion: {
    ...DOG_COMPACT.motion,
    attention: 0.92,
    headTranslateY: 0.5,
  },
};

const DOG_FLUFFY_TOY: PetRig25DProfile = {
  ...DOG_TOY,
  id: "dog-fluffy-toy",
  head: { x: 0.13, y: 0.18, width: 0.74, height: 0.35 },
  chest: { x: 0.17, y: 0.42, width: 0.66, height: 0.28 },
  engraving: { x: 0.42, y: 0.45, width: 0.16, height: 0.055 },
  shadow: { ...DOG_STANDARD.shadow, x: 0.14, width: 0.72 },
  motion: {
    ...DOG_TOY.motion,
    chestScaleX: 1.002,
    chestScaleY: 1.0035,
    headTranslateX: 0.74,
  },
};

function withStableFace(profile: PetRig25DProfile): PetRig25DProfile {
  return {
    ...profile,
    leftEar: undefined,
    rightEar: undefined,
    motion: {
      ...profile.motion,
      earTwitchDeg: 0,
    },
  };
}

const CAT_COMPACT_STABLE = withStableFace(CAT_COMPACT);
const CAT_TALL_STABLE = withStableFace(CAT_TALL);
const CAT_LONGHAIR_STABLE = withStableFace(CAT_LONGHAIR);
const DOG_STANDARD_STABLE = withStableFace(DOG_STANDARD);
const DOG_TOY_STABLE = withStableFace(DOG_TOY);
const DOG_COMPACT_STABLE = withStableFace(DOG_COMPACT);
const DOG_LARGE_STABLE = withStableFace(DOG_LARGE);
const DOG_TALL_STABLE = withStableFace(DOG_TALL);
const DOG_LONG_LOW_STABLE = withStableFace(DOG_LONG_LOW);
const DOG_FLUFFY_TOY_STABLE = withStableFace(DOG_FLUFFY_TOY);

const RIGS = new Map<string, PetRig25DProfile>([
  ["pet:luna", { ...CAT_COMPACT, id: "luna", tag: { x: 0.385, y: 0.425, width: 0.23, height: 0.115 } }],
  ["pet:milo", DOG_LARGE_STABLE],
  ["breed:dog:golden-retriever", DOG_LARGE_STABLE],
  ["breed:dog:dachshund", DOG_LONG_LOW_STABLE],
  ["breed:cat:maine-coon", CAT_LONGHAIR_STABLE],
  ["breed:cat:sphynx", CAT_TALL_STABLE],
  ["breed:dog:chihuahua", DOG_TOY_STABLE],
  ["breed:dog:french-bulldog", DOG_COMPACT_STABLE],
  ["breed:dog:border-collie", DOG_STANDARD_STABLE],
  ["breed:dog:great-dane", DOG_TALL_STABLE],
  ["breed:dog:pomeranian", DOG_FLUFFY_TOY_STABLE],
  ["breed:cat:siamese", CAT_TALL_STABLE],
  ["breed:dog:labrador-retriever", DOG_LARGE_STABLE],
  ["breed:dog:german-shepherd", DOG_LARGE_STABLE],
  ["breed:dog:siberian-husky", DOG_LARGE_STABLE],
  ["breed:dog:beagle", DOG_STANDARD_STABLE],
  ["breed:dog:standard-poodle", DOG_TALL_STABLE],
  ["breed:dog:pembroke-welsh-corgi", DOG_LONG_LOW_STABLE],
  ["breed:dog:shiba-inu", DOG_STANDARD_STABLE],
  [
    "breed:dog:samoyed",
    withStableFace({
      ...DOG_LARGE,
      id: "dog-fluffy-large",
      head: { x: 0.15, y: 0.14, width: 0.7, height: 0.34 },
      chest: { x: 0.18, y: 0.39, width: 0.64, height: 0.34 },
      shadow: { ...DOG_LARGE.shadow, x: 0.13, width: 0.74 },
    }),
  ],
  ["breed:cat:persian", CAT_LONGHAIR_STABLE],
  ["breed:cat:ragdoll", CAT_LONGHAIR_STABLE],
  ["breed:cat:bengal", CAT_TALL_STABLE],
  [
    "breed:cat:scottish-fold",
    {
      ...CAT_COMPACT,
      id: "cat-folded-ear",
      leftEar: undefined,
      rightEar: undefined,
    },
  ],
]);

const GENERATED_RIG_BASES = {
  "dog-large": DOG_LARGE,
  "dog-tall": DOG_TALL,
  "dog-fluffy-toy": DOG_FLUFFY_TOY,
  "dog-standard": DOG_STANDARD,
  "dog-compact": DOG_COMPACT,
  "cat-compact": CAT_COMPACT,
  "cat-tall": CAT_TALL,
  "cat-longhair": CAT_LONGHAIR,
} as const;

GENERATED_EXACT_BREED_PACKS.forEach((definition) => {
  const base = GENERATED_RIG_BASES[definition.rig.base];
  const eyes = definition.eyes.map((eye) => ({
    ...eye,
    sampleOffsetY: eye.height * 0.4,
  })) as unknown as readonly [PetRig25DEye, PetRig25DEye];

  RIGS.set(
    definition.key,
    withStableFace({
      ...base,
      id: definition.key.split(":").at(-1) ?? definition.key,
      head: definition.rig.head,
      eyes,
      chest: definition.rig.chest,
      shadow: {
        ...base.shadow,
        ...definition.rig.shadow,
      },
      motion: {
        ...base.motion,
        ...definition.rig.motion,
      },
    }),
  );
});

export function resolvePetRig25D(petKey: string): PetRig25DProfile | null {
  const exact = RIGS.get(petKey);
  if (exact) {
    const engraving = resolvePetEngraving(petKey);
    return engraving ? { ...exact, engraving } : exact;
  }
  if (petKey.startsWith("breed:cat:")) return CAT_COMPACT_STABLE;
  if (petKey.startsWith("breed:dog:")) return DOG_STANDARD_STABLE;
  return null;
}
