/**
 * PawPair — shadow tokens.
 *
 * Mirrors the three elevations used in App.tsx (subtle, card, fab).
 * Reused on the web and native, where the React Native shadow API expects
 * separate `shadowColor`, `shadowOffset`, etc.
 */

import { Platform, type ViewStyle } from "react-native";

import { colors } from "./colors";

export const shadow = {
  none: {} as ViewStyle,

  /** Hairline + barely-there lift. */
  subtle: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.navy,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: { elevation: 1 },
    default: {},
  }) as ViewStyle,

  /** Floating card (Pets, dose rows). */
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.navy,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    android: { elevation: 4 },
    default: {},
  }) as ViewStyle,

  /** Center FAB. */
  fab: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.coral,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35,
      shadowRadius: 24,
    },
    android: { elevation: 10 },
    default: {},
  }) as ViewStyle,
} as const;

export type ShadowToken = keyof typeof shadow;
