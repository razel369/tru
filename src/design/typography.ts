/**
 * PawPair — typography tokens.
 *
 * Two families:
 * - Fraunces (serif) — emotional display moments only (greetings, hero stats).
 * - Manrope (sans)   — navigation, labels, controls, data, body text.
 *
 * Variants match the JSX usage in the original App.tsx so the refactor is
 * purely structural. Weights are loaded via @expo-google-fonts.
 */

import type { TextStyle } from "react-native";

export const fontFamily = {
  display: "Fraunces_700Bold", // serif
  body: "Manrope_400Regular", // sans
  medium: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  extraBold: "Manrope_800ExtraBold",
} as const;

export const typography = {
  // Display (Fraunces) — used in greeting + hero numbers
  displayLg: {
    fontFamily: fontFamily.display,
    fontSize: 32,
    lineHeight: 38,
  } satisfies TextStyle,
  displayMd: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    lineHeight: 32,
  } satisfies TextStyle,

  // UI sans (Manrope)
  title: {
    fontFamily: fontFamily.extraBold,
    fontSize: 22,
    lineHeight: 28,
  } satisfies TextStyle,
  section: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    lineHeight: 22,
  } satisfies TextStyle,
  body: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
  } satisfies TextStyle,
  bodyMedium: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
  } satisfies TextStyle,
  caption: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
  } satisfies TextStyle,
  micro: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.6,
  } satisfies TextStyle,
} as const;

export type TypographyToken = keyof typeof typography;
