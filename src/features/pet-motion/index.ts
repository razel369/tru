import { LOCAL_PET_MOTION_PACKS } from "./local-packs";
import {
  auditRegisteredPetMotionBlinks,
  getRegisteredPetMotionKeys,
  registerPetMotionPacks,
  resolvePetMotionPack,
  resolvePetMotionPackForProfile,
} from "./registry";
export { resolvePetRig25D } from "./rig25d";
export type { PetRig25DEye, PetRig25DProfile, PetRig25DRegion } from "./rig25d";

registerPetMotionPacks(LOCAL_PET_MOTION_PACKS);

export {
  auditRegisteredPetMotionBlinks,
  getRegisteredPetMotionKeys,
  registerPetMotionPacks,
  resolvePetMotionPack,
  resolvePetMotionPackForProfile,
};
export type { PetMotionBlinkAudit } from "./registry";
export type {
  PetMotionFrameRegistration,
  PetMotionFrames,
  PetMotionOverlayRig,
  PetMotionPack,
  PetMotionRegion,
  PetMotionState,
  PetMotionTier,
} from "./types";
