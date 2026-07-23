import type { ImageSourcePropType } from "react-native";

import { getBreedVisualProfile, PET_SCENE_LAYOUTS } from "../../data/pet-breeds";
import type { Pet } from "../../types";

import { createBreedAssetKey, getPetVisualAsset } from "./registry";
import type {
  PetVisualAsset,
  PetVisualGenerationRequest,
  ResolvedPetVisual,
} from "./types";

function findBestAsset(pet: Pet): PetVisualAsset | undefined {
  const candidateKeys = [
    pet.visual?.assetKey,
    `pet:${pet.id}`,
    createBreedAssetKey(pet.species, pet.breed),
    `species:${pet.species}`,
  ].filter((key): key is string => Boolean(key));

  for (const key of candidateKeys) {
    const asset = getPetVisualAsset(key);
    if (asset) return asset;
  }
  return undefined;
}

export function resolvePetVisual(
  pet: Pet,
  fallbackPetSource: ImageSourcePropType,
  fallbackSceneSource?: ImageSourcePropType,
): ResolvedPetVisual {
  const asset = findBestAsset(pet);
  const profile =
    pet.visual?.profile ??
    pet.visualProfile ??
    getBreedVisualProfile(pet.species, pet.breed);
  const layout = asset?.layout ?? PET_SCENE_LAYOUTS[profile];
  const sceneContainsPet = asset?.mode === "integrated-scene" && Boolean(asset.sceneSource);

  return {
    assetKey: asset?.key ?? null,
    mode: asset?.mode ?? "anchored-cutout",
    status: asset ? "ready" : pet.visual?.status ?? "fallback",
    profile,
    layout,
    sceneSource: asset?.sceneSource ?? fallbackSceneSource,
    petSource: asset?.petSource ?? fallbackPetSource,
    sceneContainsPet,
    isFallback: !asset,
  };
}

export function createPetVisualGenerationRequest(pet: Pet): PetVisualGenerationRequest {
  const profile =
    pet.visual?.profile ??
    pet.visualProfile ??
    getBreedVisualProfile(pet.species, pet.breed);

  return {
    assetKey: `pet:${pet.id}:scene:v1`,
    petId: pet.id,
    species: pet.species,
    breed: pet.breed || "mixed breed",
    profile,
    engravingText: pet.name,
    renderMode: "integrated-scene",
    output: { width: 1536, height: 2048, format: "png" },
    qualityContract: {
      fullBodyVisible: true,
      pawsTouchFloor: true,
      preserveRoomComposition: true,
      reserveTopHeaderArea: true,
      reserveBottomCardArea: true,
      noWhiteBackground: true,
      subjectHeightRatio: { min: 0.28, max: 0.43 },
      pawsYRatio: { min: 0.58, max: 0.66 },
      bottomSafeAreaStartsAt: 0.66,
    },
  };
}
