import type { ImageSourcePropType } from "react-native";

/**
 * Clay sticker + scene assets for PawPair atmosphere.
 * Keep requires here so screens stay free of path strings.
 */
export const assets = {
  heroScene: require("../../assets/pawpair-hero-clean.png") as ImageSourcePropType,
  companion: require("../../assets/pawpair-companion-buddy.png") as ImageSourcePropType,
  icon: require("../../assets/pawpair-icon.png") as ImageSourcePropType,
  milo: require("../../assets/pawpair-milo.png") as ImageSourcePropType,
  luna: require("../../assets/pawpair-luna.png") as ImageSourcePropType,
  emptyBuddyPeek: require("../../assets/pawpair-empty-buddy-peek.png") as ImageSourcePropType,
  stickers: {
    paw: require("../../assets/pawpair-sticker-paw.png") as ImageSourcePropType,
    bone: require("../../assets/pawpair-sticker-bone.png") as ImageSourcePropType,
    heart: require("../../assets/pawpair-sticker-heart.png") as ImageSourcePropType,
    pill: require("../../assets/pawpair-sticker-pill.png") as ImageSourcePropType,
    plant: require("../../assets/pawpair-sticker-plant.png") as ImageSourcePropType,
    sun: require("../../assets/pawpair-sticker-sun.png") as ImageSourcePropType,
    check: require("../../assets/pawpair-sticker-check.png") as ImageSourcePropType,
    ball: require("../../assets/pawpair-sticker-ball.png") as ImageSourcePropType,
    bubble: require("../../assets/pawpair-sticker-bubble.png") as ImageSourcePropType,
  },
} as const;

export type StickerKey = keyof typeof assets.stickers;
