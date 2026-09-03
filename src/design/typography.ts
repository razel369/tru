/**
 * PawPair — typography tokens.
 *
 * Clay UI uses Nunito for almost everything.
 * Fraunces remains available for rare display moments.
 */

import type { TextStyle } from "react-native";

export const fontFamily = {
  display: "Fredoka_600SemiBold",
  body: "Nunito_600SemiBold",
  medium: "Nunito_600SemiBold",
  bold: "Nunito_700Bold",
  extraBold: "Nunito_800ExtraBold",
} as const;

export const typography = {
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
