import {
  resolvePetMotionClass,
  type PetMotionClass,
} from "./blink-profile";

export type PetLifeProfile = {
  attentionBlinkChance: number;
  attentionBlinkScale: number;
  attentionDelayJitterMs: readonly [number, number];
  attentionTempo: number;
  dayTempo: number;
  earTwitchEveryMs: readonly [number, number];
  earTwitchLiftMs: number;
  earTwitchReboundMs: number;
  earTwitchSettleMs: number;
  morningTempo: number;
  nightTempo: number;
  touchCooldownMs: number;
  touchHaptic: "light" | "soft";
};

const LIFE_PROFILES: Record<PetMotionClass, PetLifeProfile> = {
  cat: {
    attentionBlinkChance: 0.72,
    attentionBlinkScale: 0.86,
    attentionDelayJitterMs: [720, 1760],
    attentionTempo: 0.9,
    dayTempo: 1,
    earTwitchEveryMs: [3600, 8500],
    earTwitchLiftMs: 112,
    earTwitchReboundMs: 78,
    earTwitchSettleMs: 170,
    morningTempo: 0.92,
    nightTempo: 1.18,
    touchCooldownMs: 520,
    touchHaptic: "light",
  },
  compactDog: {
    attentionBlinkChance: 0.64,
    attentionBlinkScale: 0.88,
    attentionDelayJitterMs: [860, 1940],
    attentionTempo: 0.94,
    dayTempo: 1,
    earTwitchEveryMs: [4100, 9200],
    earTwitchLiftMs: 124,
    earTwitchReboundMs: 86,
    earTwitchSettleMs: 178,
    morningTempo: 0.9,
    nightTempo: 1.24,
    touchCooldownMs: 460,
    touchHaptic: "light",
  },
  standardDog: {
    attentionBlinkChance: 0.58,
    attentionBlinkScale: 0.9,
    attentionDelayJitterMs: [980, 2200],
    attentionTempo: 1,
    dayTempo: 1,
    earTwitchEveryMs: [4800, 10600],
    earTwitchLiftMs: 135,
    earTwitchReboundMs: 95,
    earTwitchSettleMs: 185,
    morningTempo: 0.9,
    nightTempo: 1.28,
    touchCooldownMs: 540,
    touchHaptic: "soft",
  },
  largeDog: {
    attentionBlinkChance: 0.48,
    attentionBlinkScale: 0.94,
    attentionDelayJitterMs: [1160, 2480],
    attentionTempo: 1.12,
    dayTempo: 1,
    earTwitchEveryMs: [5700, 12400],
    earTwitchLiftMs: 152,
    earTwitchReboundMs: 108,
    earTwitchSettleMs: 204,
    morningTempo: 0.94,
    nightTempo: 1.36,
    touchCooldownMs: 620,
    touchHaptic: "soft",
  },
};

const PET_LIFE_OVERRIDES: Readonly<
  Record<string, Partial<PetLifeProfile>>
> = {
  "pet:luna": {
    attentionBlinkChance: 0.78,
    earTwitchEveryMs: [3300, 7600],
  },
  "breed:dog:great-dane": {
    attentionTempo: 1.2,
  },
  "breed:dog:miniature-schnauzer": {
    attentionTempo: 0.9,
  },
};

export function resolvePetLifeProfile(
  petKey: string,
  visualProfile?: string,
): PetLifeProfile {
  const normalizedKey = petKey.toLowerCase();
  return {
    ...LIFE_PROFILES[resolvePetMotionClass(normalizedKey, visualProfile)],
    ...PET_LIFE_OVERRIDES[normalizedKey],
  };
}
