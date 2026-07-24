import { PET_SCENE_LAYOUTS } from "../../data/pet-breeds";
import { GENERATED_EXACT_BREED_PACKS } from "../pet-motion/exact-breed-packs";

import type { PetVisualAsset } from "./types";

const LUNA_CUTOUT = require("../../../assets/pawpair-luna-cutout.png");
const LUNA_SCENE = require("../../../assets/pawpair-luna-integrated-room-zoomed.png");
const MILO_CUTOUT = require("../../../assets/pawpair-milo.png");
const GOLDEN_RETRIEVER_SCENE = require("../../../assets/pawpair-breed-golden-retriever-scene-v2.png");
const DACHSHUND_SCENE = require("../../../assets/pawpair-breed-dachshund-scene-v2.png");
const MAINE_COON_SCENE = require("../../../assets/pawpair-breed-maine-coon-scene-v2.png");
const SPHYNX_SCENE = require("../../../assets/pawpair-breed-sphynx-scene-v2.png");
const CHIHUAHUA_SCENE = require("../../../assets/pawpair-breed-chihuahua-scene-v1.png");
const FRENCH_BULLDOG_SCENE = require("../../../assets/pawpair-breed-french-bulldog-scene-v1.png");
const BORDER_COLLIE_SCENE = require("../../../assets/pawpair-breed-border-collie-scene-v1.png");
const GREAT_DANE_SCENE = require("../../../assets/pawpair-breed-great-dane-scene-v1.png");
const POMERANIAN_SCENE = require("../../../assets/pawpair-breed-pomeranian-scene-v1.png");
const SIAMESE_SCENE = require("../../../assets/pawpair-breed-siamese-scene-v1.png");
const WARM_ROOM_STAGE = require("../../../assets/pet-motion/stages/warm-room-v1.png");
const LABRADOR_RETRIEVER = require("../../../assets/pet-motion/breed-labrador-retriever/idle-luna-style-v1.png");
const GERMAN_SHEPHERD = require("../../../assets/pet-motion/breed-german-shepherd/idle-luna-style-v1.png");
const SIBERIAN_HUSKY = require("../../../assets/pet-motion/breed-siberian-husky/idle-luna-style-v1.png");
const BEAGLE = require("../../../assets/pet-motion/breed-beagle/idle-luna-style-v1.png");
const STANDARD_POODLE = require("../../../assets/pet-motion/breed-standard-poodle/idle-luna-style-v1.png");
const PEMBROKE_WELSH_CORGI = require("../../../assets/pet-motion/breed-pembroke-welsh-corgi/idle-luna-style-v1.png");
const SHIBA_INU = require("../../../assets/pet-motion/breed-shiba-inu/idle-luna-style-v1.png");
const SAMOYED = require("../../../assets/pet-motion/breed-samoyed/idle-luna-style-v1.png");
const PERSIAN = require("../../../assets/pet-motion/breed-persian/idle-luna-style-v1.png");
const RAGDOLL = require("../../../assets/pet-motion/breed-ragdoll/idle-luna-style-v1.png");
const BENGAL = require("../../../assets/pet-motion/breed-bengal/idle-luna-style-v1.png");
const SCOTTISH_FOLD = require("../../../assets/pet-motion/breed-scottish-fold/idle-luna-style-v1.png");

const visualAssets = new Map<string, PetVisualAsset>([
  [
    "pet:luna",
    {
      key: "pet:luna",
      revision: 1,
      mode: "integrated-scene",
      profile: "cat-compact",
      layout: PET_SCENE_LAYOUTS["cat-compact"],
      sceneSource: LUNA_SCENE,
      petSource: LUNA_CUTOUT,
    },
  ],
  [
    "pet:milo",
    {
      key: "pet:milo",
      revision: 2,
      mode: "integrated-scene",
      profile: "dog-large",
      layout: PET_SCENE_LAYOUTS["dog-large"],
      sceneSource: GOLDEN_RETRIEVER_SCENE,
      petSource: MILO_CUTOUT,
    },
  ],
  [
    "breed:dog:golden-retriever",
    {
      key: "breed:dog:golden-retriever",
      revision: 2,
      mode: "integrated-scene",
      profile: "dog-large",
      layout: PET_SCENE_LAYOUTS["dog-large"],
      sceneSource: GOLDEN_RETRIEVER_SCENE,
    },
  ],
  [
    "breed:dog:dachshund",
    {
      key: "breed:dog:dachshund",
      revision: 2,
      mode: "integrated-scene",
      profile: "dog-long-low",
      layout: PET_SCENE_LAYOUTS["dog-long-low"],
      sceneSource: DACHSHUND_SCENE,
    },
  ],
  [
    "breed:cat:maine-coon",
    {
      key: "breed:cat:maine-coon",
      revision: 2,
      mode: "integrated-scene",
      profile: "cat-longhair",
      layout: PET_SCENE_LAYOUTS["cat-longhair"],
      sceneSource: MAINE_COON_SCENE,
    },
  ],
  [
    "breed:cat:sphynx",
    {
      key: "breed:cat:sphynx",
      revision: 2,
      mode: "integrated-scene",
      profile: "cat-hairless",
      layout: PET_SCENE_LAYOUTS["cat-hairless"],
      sceneSource: SPHYNX_SCENE,
    },
  ],
  [
    "breed:dog:chihuahua",
    {
      key: "breed:dog:chihuahua",
      revision: 1,
      mode: "integrated-scene",
      profile: "dog-toy",
      layout: PET_SCENE_LAYOUTS["dog-toy"],
      sceneSource: CHIHUAHUA_SCENE,
    },
  ],
  [
    "breed:dog:french-bulldog",
    {
      key: "breed:dog:french-bulldog",
      revision: 1,
      mode: "integrated-scene",
      profile: "dog-compact",
      layout: PET_SCENE_LAYOUTS["dog-compact"],
      sceneSource: FRENCH_BULLDOG_SCENE,
    },
  ],
  [
    "breed:dog:border-collie",
    {
      key: "breed:dog:border-collie",
      revision: 1,
      mode: "integrated-scene",
      profile: "dog-standard",
      layout: PET_SCENE_LAYOUTS["dog-standard"],
      sceneSource: BORDER_COLLIE_SCENE,
    },
  ],
  [
    "breed:dog:great-dane",
    {
      key: "breed:dog:great-dane",
      revision: 1,
      mode: "integrated-scene",
      profile: "dog-tall",
      layout: PET_SCENE_LAYOUTS["dog-tall"],
      sceneSource: GREAT_DANE_SCENE,
    },
  ],
  [
    "breed:dog:pomeranian",
    {
      key: "breed:dog:pomeranian",
      revision: 1,
      mode: "integrated-scene",
      profile: "dog-toy",
      layout: PET_SCENE_LAYOUTS["dog-toy"],
      sceneSource: POMERANIAN_SCENE,
    },
  ],
  [
    "breed:cat:siamese",
    {
      key: "breed:cat:siamese",
      revision: 1,
      mode: "integrated-scene",
      profile: "cat-tall",
      layout: PET_SCENE_LAYOUTS["cat-tall"],
      sceneSource: SIAMESE_SCENE,
    },
  ],
]);

const lunaStyleBreedAssets = [
  ["breed:dog:labrador-retriever", LABRADOR_RETRIEVER, "dog-large"],
  ["breed:dog:german-shepherd", GERMAN_SHEPHERD, "dog-large"],
  ["breed:dog:siberian-husky", SIBERIAN_HUSKY, "dog-large"],
  ["breed:dog:beagle", BEAGLE, "dog-standard"],
  ["breed:dog:standard-poodle", STANDARD_POODLE, "dog-tall"],
  ["breed:dog:pembroke-welsh-corgi", PEMBROKE_WELSH_CORGI, "dog-long-low"],
  ["breed:dog:shiba-inu", SHIBA_INU, "dog-standard"],
  ["breed:dog:samoyed", SAMOYED, "dog-large"],
  ["breed:cat:persian", PERSIAN, "cat-longhair"],
  ["breed:cat:ragdoll", RAGDOLL, "cat-longhair"],
  ["breed:cat:bengal", BENGAL, "cat-tall"],
  ["breed:cat:scottish-fold", SCOTTISH_FOLD, "cat-compact"],
] as const;

lunaStyleBreedAssets.forEach(([key, petSource, profile]) => {
  visualAssets.set(key, {
    key,
    revision: 1,
    mode: "anchored-cutout",
    profile,
    layout: PET_SCENE_LAYOUTS[profile],
    sceneSource: WARM_ROOM_STAGE,
    petSource,
  });
});

GENERATED_EXACT_BREED_PACKS.forEach(({ key, idle, profile }) => {
  visualAssets.set(key, {
    key,
    revision: 1,
    mode: "anchored-cutout",
    profile,
    layout: PET_SCENE_LAYOUTS[profile],
    sceneSource: WARM_ROOM_STAGE,
    petSource: idle,
  });
});

export function registerPetVisualAsset(asset: PetVisualAsset): void {
  const current = visualAssets.get(asset.key);
  if (!current || asset.revision >= current.revision) {
    visualAssets.set(asset.key, asset);
  }
}

export function getPetVisualAsset(key: string): PetVisualAsset | undefined {
  return visualAssets.get(key);
}

const BREED_ASSET_ALIASES: Readonly<Record<string, string>> = {
  "breed:cat:british-shorthair": "pet:luna",
  "breed:dog:german-shepherd-dog": "breed:dog:german-shepherd",
  "breed:dog:poodle-standard": "breed:dog:standard-poodle",
};

export function createBreedAssetKey(species: string, breed: string): string {
  const breedSlug = breed
    .trim()
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const key = "breed:" + species + ":" + (breedSlug || "mixed");
  return BREED_ASSET_ALIASES[key] ?? key;
}

export function hasExactBreedVisual(species: string, breed: string): boolean {
  return visualAssets.has(createBreedAssetKey(species, breed));
}
