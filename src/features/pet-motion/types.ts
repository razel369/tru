import type { ImageSourcePropType } from "react-native";

export type PetMotionState =
  | "idle"
  | "blinkHalf"
  | "blink"
  | "attention"
  | "happy"
  | "sleepy";

export type PetMotionTier = "base" | "expressive" | "personalized";

export type PetMotionFrames = {
  idle: ImageSourcePropType;
  blinkHalf?: ImageSourcePropType;
  blink?: ImageSourcePropType;
  attention?: ImageSourcePropType;
  happy?: ImageSourcePropType;
  sleepy?: ImageSourcePropType;
};

export type PetMotionRegion = {
  x: number;
  y: number;
  height: number;
  width: number;
};

export type PetMotionFrameRegistration = {
  scaleX?: number;
  scaleY?: number;
  translateX?: number;
  translateY?: number;
};

export type PetMotionOverlayRig = {
  region: PetMotionRegion;
  regions?: readonly PetMotionRegion[];
  registration?: PetMotionFrameRegistration;
};

export type PetMotionPack = {
  version: 1;
  petKey: string;
  tier: PetMotionTier;
  stage: ImageSourcePropType;
  states: PetMotionFrames;
  canvas: {
    anchorX: number;
    feetY: number;
    height: number;
    width: number;
  };
  rig?: {
    overlays?: Partial<Record<PetMotionState, PetMotionOverlayRig>>;
  };
  behavior?: {
    blinkEveryMs?: readonly [number, number];
    attentionHoldMs?: number;
    happyHoldMs?: number;
  };
};
