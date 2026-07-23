import type { ImageSourcePropType } from "react-native";

import type { BreedVisualProfile, PetVisualStatus } from "../../types";

export type PetVisualRenderMode = "integrated-scene" | "anchored-cutout";

export interface PetVisualLayout {
  anchorX: number;
  feetY: number;
  maxWidth: number;
  scale: number;
}

export interface PetVisualAsset {
  key: string;
  revision: number;
  mode: PetVisualRenderMode;
  profile: BreedVisualProfile;
  layout: PetVisualLayout;
  sceneSource?: ImageSourcePropType;
  petSource?: ImageSourcePropType;
}

export interface ResolvedPetVisual {
  assetKey: string | null;
  mode: PetVisualRenderMode;
  status: PetVisualStatus;
  profile: BreedVisualProfile;
  layout: PetVisualLayout;
  sceneSource?: ImageSourcePropType;
  petSource: ImageSourcePropType;
  sceneContainsPet: boolean;
  isFallback: boolean;
}

export interface PetVisualGenerationRequest {
  assetKey: string;
  petId: string;
  species: "dog" | "cat" | "other";
  breed: string;
  profile: BreedVisualProfile;
  engravingText: string;
  renderMode: "integrated-scene";
  output: {
    width: 1536;
    height: 2048;
    format: "png";
  };
  qualityContract: {
    fullBodyVisible: true;
    pawsTouchFloor: true;
    preserveRoomComposition: true;
    reserveTopHeaderArea: true;
    reserveBottomCardArea: true;
    noWhiteBackground: true;
    subjectHeightRatio: { min: number; max: number };
    pawsYRatio: { min: number; max: number };
    bottomSafeAreaStartsAt: number;
  };
}
