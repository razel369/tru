import type { PetMotionPack } from "./types";
import { GENERATED_EXACT_BREED_PACKS } from "./exact-breed-packs";

const WARM_ROOM_STAGE = require("../../../assets/pet-motion/stages/warm-room-v1.png");
const LUNA_IDLE = require("../../../assets/pet-motion/pet-luna/idle-v2.png");
const LUNA_BLINK_HALF = require("../../../assets/pet-motion/pet-luna/blink-half.png");
const LUNA_BLINK = require("../../../assets/pet-motion/pet-luna/blink.png");
const MILO_IDLE = require("../../../assets/pet-motion/pet-milo/idle-luna-style-v1.png");
const DACHSHUND_IDLE = require("../../../assets/pet-motion/breed-dachshund/idle-luna-style-v1.png");
const MAINE_COON_IDLE = require("../../../assets/pet-motion/breed-maine-coon/idle-luna-style-v1.png");

export const LOCAL_PET_MOTION_PACKS: PetMotionPack[] = [
  {
    version: 1,
    petKey: "pet:luna",
    tier: "expressive",
    stage: WARM_ROOM_STAGE,
    states: {
      idle: LUNA_IDLE,
      blinkHalf: LUNA_BLINK_HALF,
      blink: LUNA_BLINK,
      happy: LUNA_BLINK,
    },
    canvas: {
      anchorX: 0.5,
      feetY: 0.705,
      height: 1846,
      width: 852,
    },
    rig: {
      overlays: {
        blinkHalf: {
          region: { x: 0.22, y: 0.285, height: 0.075, width: 0.56 },
        },
        blink: {
          region: { x: 0.22, y: 0.285, height: 0.075, width: 0.56 },
          registration: {
            scaleX: 1.00574,
            scaleY: 1.00211,
            translateX: 0.00096,
            translateY: -0.00073,
          },
        },
        happy: {
          region: { x: 0.22, y: 0.285, height: 0.075, width: 0.56 },
          registration: {
            scaleX: 1.00574,
            scaleY: 1.00211,
            translateX: 0.00096,
            translateY: -0.00073,
          },
        },
      },
    },
    behavior: {
      blinkEveryMs: [5000, 10000],
    },
  },
  {
    version: 1,
    petKey: "pet:milo",
    tier: "base",
    stage: WARM_ROOM_STAGE,
    states: {
      idle: MILO_IDLE,
    },
    canvas: {
      anchorX: 0.5,
      feetY: 0.785,
      height: 1846,
      width: 852,
    },
    rig: {
      overlays: {
        blink: {
          region: { x: 0.28, y: 0.19, height: 0.07, width: 0.44 },
          registration: {
            scaleX: 1.0038,
            scaleY: 1.00084,
            translateX: 0.0011,
            translateY: 0.0003,
          },
        },
        happy: {
          region: { x: 0.28, y: 0.19, height: 0.07, width: 0.44 },
          registration: {
            scaleX: 1.0038,
            scaleY: 1.00084,
            translateX: 0.0011,
            translateY: 0.0003,
          },
        },
      },
    },
    behavior: {
      blinkEveryMs: [5500, 11000],
    },
  },
  {
    version: 1,
    petKey: "breed:dog:golden-retriever",
    tier: "base",
    stage: WARM_ROOM_STAGE,
    states: {
      idle: MILO_IDLE,
    },
    canvas: {
      anchorX: 0.5,
      feetY: 0.785,
      height: 1846,
      width: 852,
    },
    rig: {
      overlays: {
        blink: {
          region: { x: 0.28, y: 0.19, height: 0.07, width: 0.44 },
          registration: {
            scaleX: 1.0038,
            scaleY: 1.00084,
            translateX: 0.0011,
            translateY: 0.0003,
          },
        },
        happy: {
          region: { x: 0.28, y: 0.19, height: 0.07, width: 0.44 },
          registration: {
            scaleX: 1.0038,
            scaleY: 1.00084,
            translateX: 0.0011,
            translateY: 0.0003,
          },
        },
      },
    },
    behavior: {
      blinkEveryMs: [5500, 11000],
    },
  },
  {
    version: 1,
    petKey: "breed:dog:dachshund",
    tier: "base",
    stage: WARM_ROOM_STAGE,
    states: {
      idle: DACHSHUND_IDLE,
    },
    canvas: {
      anchorX: 0.5,
      feetY: 0.705,
      height: 1846,
      width: 852,
    },
    rig: {
      overlays: {
        blink: {
          region: { x: 0.28, y: 0.245, height: 0.08, width: 0.44 },
          registration: {
            scaleX: 1.00201,
            scaleY: 1.00112,
            translateX: 0.00059,
            translateY: 0.00031,
          },
        },
        happy: {
          region: { x: 0.28, y: 0.245, height: 0.08, width: 0.44 },
          registration: {
            scaleX: 1.00201,
            scaleY: 1.00112,
            translateX: 0.00059,
            translateY: 0.00031,
          },
        },
      },
    },
    behavior: {
      blinkEveryMs: [5000, 10500],
    },
  },
  {
    version: 1,
    petKey: "breed:cat:maine-coon",
    tier: "base",
    stage: WARM_ROOM_STAGE,
    states: {
      idle: MAINE_COON_IDLE,
    },
    canvas: {
      anchorX: 0.5,
      feetY: 0.768,
      height: 1846,
      width: 852,
    },
    rig: {
      overlays: {
        blink: {
          region: { x: 0.28, y: 0.26, height: 0.09, width: 0.44 },
          registration: {
            scaleX: 1.00579,
            scaleY: 1.00092,
            translateX: 0.00013,
            translateY: 0.00032,
          },
        },
        happy: {
          region: { x: 0.28, y: 0.26, height: 0.09, width: 0.44 },
          registration: {
            scaleX: 1.00579,
            scaleY: 1.00092,
            translateX: 0.00013,
            translateY: 0.00032,
          },
        },
      },
    },
    behavior: {
      blinkEveryMs: [6000, 12000],
    },
  },
];

const sphynxIdle = require("../../../assets/pet-motion/breed-sphynx/idle-luna-style-v1.png");
const chihuahuaIdle = require("../../../assets/pet-motion/breed-chihuahua/idle-luna-style-v1.png");
const frenchBulldogIdle = require("../../../assets/pet-motion/breed-french-bulldog/idle-luna-style-v1.png");
const borderCollieIdle = require("../../../assets/pet-motion/breed-border-collie/idle-luna-style-v1.png");
const greatDaneIdle = require("../../../assets/pet-motion/breed-great-dane/idle-luna-style-v1.png");
const pomeranianIdle = require("../../../assets/pet-motion/breed-pomeranian/idle-luna-style-v1.png");
const siameseIdle = require("../../../assets/pet-motion/breed-siamese/idle-luna-style-v1.png");
const labradorRetrieverIdle = require("../../../assets/pet-motion/breed-labrador-retriever/idle-luna-style-v1.png");
const germanShepherdIdle = require("../../../assets/pet-motion/breed-german-shepherd/idle-luna-style-v1.png");
const siberianHuskyIdle = require("../../../assets/pet-motion/breed-siberian-husky/idle-luna-style-v1.png");
const beagleIdle = require("../../../assets/pet-motion/breed-beagle/idle-luna-style-v1.png");
const standardPoodleIdle = require("../../../assets/pet-motion/breed-standard-poodle/idle-luna-style-v1.png");
const pembrokeWelshCorgiIdle = require("../../../assets/pet-motion/breed-pembroke-welsh-corgi/idle-luna-style-v1.png");
const shibaInuIdle = require("../../../assets/pet-motion/breed-shiba-inu/idle-luna-style-v1.png");
const samoyedIdle = require("../../../assets/pet-motion/breed-samoyed/idle-luna-style-v1.png");
const persianIdle = require("../../../assets/pet-motion/breed-persian/idle-luna-style-v1.png");
const ragdollIdle = require("../../../assets/pet-motion/breed-ragdoll/idle-luna-style-v1.png");
const bengalIdle = require("../../../assets/pet-motion/breed-bengal/idle-luna-style-v1.png");
const scottishFoldIdle = require("../../../assets/pet-motion/breed-scottish-fold/idle-luna-style-v1.png");

type ScaledBreedMotionConfig = {
  petKey: string;
  idle: number;
  width: number;
  height: number;
  feetY: number;
  eyeRegion: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  eyeRegions?: readonly {
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
  registration: {
    scaleX: number;
    scaleY: number;
    translateX: number;
    translateY: number;
  };
  halfRegistration: {
    scaleX: number;
    scaleY: number;
    translateX: number;
    translateY: number;
  };
  blinkEveryMs: [number, number];
};

const scaledBreedReference = LOCAL_PET_MOTION_PACKS.find(
  (pack) => pack.petKey === "breed:dog:dachshund",
) as PetMotionPack;

const createScaledBreedMotionPack = ({
  petKey,
  idle,
  width,
  height,
  feetY,
  eyeRegion,
  eyeRegions,
  registration,
  halfRegistration,
  blinkEveryMs,
}: ScaledBreedMotionConfig): PetMotionPack => ({
  ...scaledBreedReference,
  petKey,
  states: { idle },
  canvas: {
    width,
    height,
    feetY,
    anchorX: 0.5,
  },
  rig: {
    ...scaledBreedReference.rig,
    overlays: {
      blinkHalf: {
        region: eyeRegion,
        regions: eyeRegions,
        registration: halfRegistration,
      },
      blink: {
        region: eyeRegion,
        regions: eyeRegions,
        registration,
      },
      happy: {
        region: eyeRegion,
        regions: eyeRegions,
        registration,
      },
    },
  },
  behavior: {
    ...scaledBreedReference.behavior,
    blinkEveryMs,
  },
});

LOCAL_PET_MOTION_PACKS.push(
  createScaledBreedMotionPack({
    petKey: "breed:cat:sphynx",
    idle: sphynxIdle,
    width: 853,
    height: 1844,
    feetY: 0.782,
    eyeRegion: { x: 0.26, y: 0.26, width: 0.48, height: 0.12 },
    registration: { scaleX: 1.001916, scaleY: 1, translateX: 0.000616, translateY: 0 },
    halfRegistration: { scaleX: 1.005769, scaleY: 1.000842, translateX: 0.000677, translateY: 0.000286 },
    blinkEveryMs: [5600, 9400],
  }),
  createScaledBreedMotionPack({
    petKey: "breed:dog:chihuahua",
    idle: chihuahuaIdle,
    width: 853,
    height: 1844,
    feetY: 0.747831,
    eyeRegion: { x: 0.25, y: 0.26, width: 0.5, height: 0.12 },
    registration: { scaleX: 1.006329, scaleY: 1, translateX: 0.000805, translateY: 0 },
    halfRegistration: { scaleX: 1.009524, scaleY: 1, translateX: 0.00062, translateY: 0 },
    blinkEveryMs: [4800, 8200],
  }),
  createScaledBreedMotionPack({
    petKey: "breed:dog:french-bulldog",
    idle: frenchBulldogIdle,
    width: 853,
    height: 1844,
    feetY: 0.764642,
    eyeRegion: { x: 0.26, y: 0.295, width: 0.48, height: 0.12 },
    registration: { scaleX: 1.003676, scaleY: 1.000962, translateX: 0.001097, translateY: 0.000288 },
    halfRegistration: { scaleX: 1.00738, scaleY: 1.000962, translateX: 0.001021, translateY: 0.000288 },
    blinkEveryMs: [5200, 8800],
  }),
  createScaledBreedMotionPack({
    petKey: "breed:dog:border-collie",
    idle: borderCollieIdle,
    width: 852,
    height: 1846,
    feetY: 0.714518,
    eyeRegion: { x: 0.27, y: 0.23, width: 0.46, height: 0.12 },
    registration: { scaleX: 1.008, scaleY: 1, translateX: 0, translateY: 0 },
    halfRegistration: { scaleX: 1.009615, scaleY: 1, translateX: 0.000474, translateY: 0.000542 },
    blinkEveryMs: [5000, 8500],
  }),
  createScaledBreedMotionPack({
    petKey: "breed:dog:great-dane",
    idle: greatDaneIdle,
    width: 853,
    height: 1844,
    feetY: 0.822126,
    eyeRegion: { x: 0.29, y: 0.18, width: 0.42, height: 0.11 },
    eyeRegions: [
      { x: 0.376, y: 0.145, width: 0.085, height: 0.034 },
      { x: 0.529, y: 0.145, width: 0.085, height: 0.034 },
    ],
    registration: { scaleX: 1, scaleY: 1, translateX: 0.008, translateY: 0 },
    halfRegistration: { scaleX: 1, scaleY: 1, translateX: 0.007, translateY: 0 },
    blinkEveryMs: [5900, 9800],
  }),
  createScaledBreedMotionPack({
    petKey: "breed:dog:pomeranian",
    idle: pomeranianIdle,
    width: 852,
    height: 1846,
    feetY: 0.709642,
    eyeRegion: { x: 0.27, y: 0.295, width: 0.46, height: 0.12 },
    registration: { scaleX: 1.004566, scaleY: 1, translateX: -0.000772, translateY: 0 },
    halfRegistration: { scaleX: 1.001517, scaleY: 0.998878, translateX: 0.000527, translateY: 0.000235 },
    blinkEveryMs: [4700, 8100],
  }),
  createScaledBreedMotionPack({
    petKey: "breed:cat:siamese",
    idle: siameseIdle,
    width: 853,
    height: 1844,
    feetY: 0.79013,
    eyeRegion: { x: 0.26, y: 0.195, width: 0.48, height: 0.12 },
    registration: { scaleX: 1.001972, scaleY: 0.999188, translateX: 0.000665, translateY: 0.000778 },
    halfRegistration: { scaleX: 1.005941, scaleY: 1, translateX: 0.000823, translateY: 0.000542 },
    blinkEveryMs: [5700, 9500],
  }),
);

const createIdleBreedMotionPack = (
  petKey: string,
  idle: number,
  feetY: number,
): PetMotionPack => ({
  version: 1,
  petKey,
  tier: "base",
  stage: WARM_ROOM_STAGE,
  states: { idle },
  canvas: {
    anchorX: 0.5,
    feetY,
    height: 1846,
    width: 852,
  },
});

LOCAL_PET_MOTION_PACKS.push(
  createIdleBreedMotionPack(
    "breed:dog:labrador-retriever",
    labradorRetrieverIdle,
    0.785,
  ),
  createIdleBreedMotionPack(
    "breed:dog:german-shepherd",
    germanShepherdIdle,
    0.715,
  ),
  createIdleBreedMotionPack(
    "breed:dog:siberian-husky",
    siberianHuskyIdle,
    0.715,
  ),
  createIdleBreedMotionPack("breed:dog:beagle", beagleIdle, 0.785),
  createIdleBreedMotionPack(
    "breed:dog:standard-poodle",
    standardPoodleIdle,
    0.785,
  ),
  createIdleBreedMotionPack(
    "breed:dog:pembroke-welsh-corgi",
    pembrokeWelshCorgiIdle,
    0.705,
  ),
  createIdleBreedMotionPack("breed:dog:shiba-inu", shibaInuIdle, 0.715),
  createIdleBreedMotionPack("breed:dog:samoyed", samoyedIdle, 0.715),
  createIdleBreedMotionPack("breed:cat:persian", persianIdle, 0.74),
  createIdleBreedMotionPack("breed:cat:ragdoll", ragdollIdle, 0.74),
  createIdleBreedMotionPack("breed:cat:bengal", bengalIdle, 0.79),
  createIdleBreedMotionPack(
    "breed:cat:scottish-fold",
    scottishFoldIdle,
    0.705,
  ),
);

GENERATED_EXACT_BREED_PACKS.forEach(({ feetY, idle, key }) => {
  LOCAL_PET_MOTION_PACKS.push(createIdleBreedMotionPack(key, idle, feetY));
});

// One authored blink registry drives every breed. Tight, independent eye clips
// keep generated expression frames from moving the face, ears, or muzzle.
type AuthoredBlinkEyeRegion = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type AuthoredBlinkRegistration = {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly translateX: number;
  readonly translateY: number;
};

type AuthoredBlinkSpec = {
  readonly half: number;
  readonly full: number;
  readonly eyes: readonly AuthoredBlinkEyeRegion[];
  readonly halfRegistration?: AuthoredBlinkRegistration;
  readonly registration?: AuthoredBlinkRegistration;
};

const identityBlinkRegistration: AuthoredBlinkRegistration = {
  scaleX: 1,
  scaleY: 1,
  translateX: 0,
  translateY: 0,
};

// The authored Bernese closed frame is one source pixel taller than its
// 852x1846 idle/half frames. `contain` therefore narrows it by 1846/1847;
// compensate on X so the eyelids stay registered without resampling the art.
const berneseClosedBlinkRegistration: AuthoredBlinkRegistration = {
  ...identityBlinkRegistration,
  scaleX: 1847 / 1846,
};

const eyePair = (
  leftX: number,
  rightX: number,
  y: number,
  width: number,
  height: number,
): readonly [AuthoredBlinkEyeRegion, AuthoredBlinkEyeRegion] => [
  { x: leftX, y, width, height },
  { x: rightX, y, width, height },
];

const blinkSpec = (
  half: number,
  full: number,
  eyes: readonly AuthoredBlinkEyeRegion[],
  halfRegistration?: AuthoredBlinkRegistration,
  registration?: AuthoredBlinkRegistration,
): AuthoredBlinkSpec => ({
  half,
  full,
  eyes,
  halfRegistration,
  registration,
});

const authoredBlinkSpecs: Readonly<Record<string, AuthoredBlinkSpec>> = {
  "pet:luna": blinkSpec(
    LUNA_BLINK_HALF,
    LUNA_BLINK,
    eyePair(0.345, 0.525, 0.292, 0.135, 0.076),
    identityBlinkRegistration,
    {
      scaleX: 1.00574,
      scaleY: 1.00211,
      translateX: 0.00096,
      translateY: -0.00073,
    },
  ),
  "pet:milo": blinkSpec(
    require("../../../assets/pet-motion/pet-milo/blink-half-v2.png"),
    require("../../../assets/pet-motion/pet-milo/blink-v2.png"),
    eyePair(0.373, 0.555, 0.201, 0.09, 0.04),
  ),
  "breed:dog:golden-retriever": blinkSpec(
    require("../../../assets/pet-motion/pet-milo/blink-half-v2.png"),
    require("../../../assets/pet-motion/pet-milo/blink-v2.png"),
    eyePair(0.373, 0.555, 0.201, 0.09, 0.04),
  ),
  "breed:dog:dachshund": blinkSpec(
    require("../../../assets/pet-motion/breed-dachshund/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-dachshund/blink-v2.png"),
    eyePair(0.382, 0.555, 0.269, 0.09, 0.046),
  ),
  "breed:cat:maine-coon": blinkSpec(
    require("../../../assets/pet-motion/breed-maine-coon/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-maine-coon/blink-v2.png"),
    eyePair(0.402, 0.566, 0.278, 0.086, 0.046),
  ),
  "breed:cat:sphynx": blinkSpec(
    require("../../../assets/pet-motion/breed-sphynx/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-sphynx/blink-v2.png"),
    eyePair(0.361, 0.547, 0.278, 0.096, 0.05),
  ),
  "breed:dog:chihuahua": blinkSpec(
    require("../../../assets/pet-motion/breed-chihuahua/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-chihuahua/blink-v2.png"),
    eyePair(0.306, 0.52, 0.28, 0.106, 0.056),
  ),
  "breed:dog:french-bulldog": blinkSpec(
    require("../../../assets/pet-motion/breed-french-bulldog/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-french-bulldog/blink-v2.png"),
    eyePair(0.309, 0.563, 0.31, 0.11, 0.056),
  ),
  "breed:dog:border-collie": blinkSpec(
    require("../../../assets/pet-motion/breed-border-collie/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-border-collie/blink-v2.png"),
    eyePair(0.369, 0.537, 0.268, 0.09, 0.046),
  ),
  "breed:dog:great-dane": blinkSpec(
    require("../../../assets/pet-motion/breed-great-dane/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-great-dane/blink-v2.png"),
    eyePair(0.376, 0.529, 0.145, 0.085, 0.034),
    { scaleX: 1, scaleY: 1, translateX: 0.007, translateY: 0 },
    { scaleX: 1, scaleY: 1, translateX: 0.008, translateY: 0 },
  ),
  "breed:dog:pomeranian": blinkSpec(
    require("../../../assets/pet-motion/breed-pomeranian/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-pomeranian/blink-v2.png"),
    eyePair(0.35, 0.519, 0.33, 0.09, 0.046),
  ),
  "breed:cat:siamese": blinkSpec(
    require("../../../assets/pet-motion/breed-siamese/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-siamese/blink-v2.png"),
    eyePair(0.355, 0.515, 0.23, 0.13, 0.07),
    identityBlinkRegistration,
    identityBlinkRegistration,
  ),
  "breed:dog:labrador-retriever": blinkSpec(
    require("../../../assets/pet-motion/breed-labrador-retriever/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-labrador-retriever/blink-v2.png"),
    eyePair(0.357, 0.552, 0.234, 0.096, 0.046),
  ),
  "breed:dog:german-shepherd": blinkSpec(
    require("../../../assets/pet-motion/breed-german-shepherd/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-german-shepherd/blink-v2.png"),
    eyePair(0.398, 0.543, 0.257, 0.086, 0.046),
  ),
  "breed:dog:siberian-husky": blinkSpec(
    require("../../../assets/pet-motion/breed-siberian-husky/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-siberian-husky/blink-v2.png"),
    eyePair(0.373, 0.532, 0.266, 0.09, 0.046),
  ),
  "breed:dog:beagle": blinkSpec(
    require("../../../assets/pet-motion/breed-beagle/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-beagle/blink-v2.png"),
    eyePair(0.357, 0.552, 0.193, 0.096, 0.046),
  ),
  "breed:dog:standard-poodle": blinkSpec(
    require("../../../assets/pet-motion/breed-standard-poodle/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-standard-poodle/blink-v2.png"),
    eyePair(0.378, 0.546, 0.208, 0.09, 0.046),
  ),
  "breed:dog:pembroke-welsh-corgi": blinkSpec(
    require("../../../assets/pet-motion/breed-pembroke-welsh-corgi/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-pembroke-welsh-corgi/blink-v2.png"),
    eyePair(0.35, 0.555, 0.33, 0.1, 0.05),
  ),
  "breed:dog:shiba-inu": blinkSpec(
    require("../../../assets/pet-motion/breed-shiba-inu/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-shiba-inu/blink-v2.png"),
    eyePair(0.366, 0.516, 0.298, 0.086, 0.046),
  ),
  "breed:dog:samoyed": blinkSpec(
    require("../../../assets/pet-motion/breed-samoyed/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-samoyed/blink-v2.png"),
    eyePair(0.375, 0.534, 0.279, 0.086, 0.042),
  ),
  "breed:cat:persian": blinkSpec(
    require("../../../assets/pet-motion/breed-persian/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-persian/blink-v2.png"),
    eyePair(0.387, 0.555, 0.286, 0.09, 0.046),
  ),
  "breed:cat:ragdoll": blinkSpec(
    require("../../../assets/pet-motion/breed-ragdoll/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-ragdoll/blink-v2.png"),
    eyePair(0.402, 0.552, 0.279, 0.086, 0.046),
  ),
  "breed:cat:bengal": blinkSpec(
    require("../../../assets/pet-motion/breed-bengal/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-bengal/blink-v2.png"),
    eyePair(0.371, 0.525, 0.238, 0.086, 0.046),
  ),
  "breed:cat:scottish-fold": blinkSpec(
    require("../../../assets/pet-motion/breed-scottish-fold/blink-half-v2.png"),
    require("../../../assets/pet-motion/breed-scottish-fold/blink-v2.png"),
    eyePair(0.33, 0.5, 0.26, 0.18, 0.12),
    identityBlinkRegistration,
    identityBlinkRegistration,
  ),
  ...Object.fromEntries(
    GENERATED_EXACT_BREED_PACKS.map(({ blink, blinkHalf, eyes, key }) => [
      key,
      blinkSpec(
        blinkHalf,
        blink,
        eyes,
        identityBlinkRegistration,
        key === "breed:dog:bernese-mountain-dog"
          ? berneseClosedBlinkRegistration
          : identityBlinkRegistration,
      ),
    ]),
  ),
};

const combineEyeRegions = (eyes: readonly AuthoredBlinkEyeRegion[]) => {
  const x = Math.min(...eyes.map((eye) => eye.x));
  const y = Math.min(...eyes.map((eye) => eye.y));
  const maxX = Math.max(...eyes.map((eye) => eye.x + eye.width));
  const maxY = Math.max(...eyes.map((eye) => eye.y + eye.height));
  return { x, y, width: maxX - x, height: maxY - y };
};

for (let index = 0; index < LOCAL_PET_MOTION_PACKS.length; index += 1) {
  const pack = LOCAL_PET_MOTION_PACKS[index];
  if (!pack) continue;
  const spec = authoredBlinkSpecs[pack.petKey];
  if (!spec) continue;

  const region = combineEyeRegions(spec.eyes);
  const halfRegistration =
    spec.halfRegistration ?? identityBlinkRegistration;
  const registration = spec.registration ?? identityBlinkRegistration;

  LOCAL_PET_MOTION_PACKS[index] = {
    ...pack,
    states: {
      ...pack.states,
      blinkHalf: spec.half,
      blink: spec.full,
      happy: spec.full,
    },
    rig: {
      ...pack.rig,
      overlays: {
        ...pack.rig?.overlays,
        blinkHalf: {
          region,
          regions: spec.eyes,
          registration: halfRegistration,
        },
        blink: {
          region,
          regions: spec.eyes,
          registration,
        },
        happy: {
          region,
          regions: spec.eyes,
          registration,
        },
      },
    },
  };
}
