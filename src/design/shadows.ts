/**
 * PawPair — soft clay elevation tokens.
 */

import { Platform, type ViewStyle } from "react-native";

import { colors } from "./colors";

export const shadow = {
  none: {} as ViewStyle,

  /** Barely-there lift for chips. */
  subtle: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#2A3A4A",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  }) as ViewStyle,

  /** Floating clay cards (dose stickers, speech bubble). */
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#1A2834",
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.16,
      shadowRadius: 28,
    },
    android: { elevation: 10 },
    default: {},
  }) as ViewStyle,

  /** Primary CTA / companion presence. */
  fab: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.coral,
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.42,
      shadowRadius: 28,
    },
    android: { elevation: 14 },
    default: {},
  }) as ViewStyle,

  /** Soft clay puck under the companion. */
  clay: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#8B6B4A",
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.22,
      shadowRadius: 28,
    },
    android: { elevation: 10 },
    default: {},
  }) as ViewStyle,
} as const;

export type ShadowToken = keyof typeof shadow;
