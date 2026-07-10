import { colors as lightColors } from "./colors";

/**
 * PawPair — design themes.
 *
 * docs/AAA-HANDOFF.md §10: "Light and dark variants. The dark
 * variant must hold the same visual identity (cream surfaces,
 * coral primary, sage success) and meet WCAG AA contrast."
 *
 * We expose a Theme object the components can read at render
 * time. The legacy `colors` import continues to work as the
 * light theme so we do not have to refactor every call site.
 */

export interface ThemeColors {
  background: string;
  paper: string;
  ink: string;
  navy: string;
  muted: string;
  line: string;
  coral: string;
  coralSoft: string;
  sage: string;
  sageSoft: string;
  butter: string;
  butterSoft: string;
  lavender: string;
  white: string;
  danger: string;
}

export const lightTheme: ThemeColors = lightColors;

export const darkTheme: ThemeColors = {
  background: "#0E1A22",
  paper: "#172530",
  ink: "#F7F4EE",
  navy: "#9FB6C6",
  muted: "#8FA0AE",
  line: "#23354A",
  coral: "#F08B70",
  coralSoft: "#3B2326",
  sage: "#7AB5A6",
  sageSoft: "#1F2E2C",
  butter: "#F2C268",
  butterSoft: "#3A2E1E",
  lavender: "#A89BCC",
  white: "#0E1A22",
  danger: "#E08585",
};

export function colorsFor(scheme: "light" | "dark"): ThemeColors {
  return scheme === "dark" ? darkTheme : lightTheme;
}

export type ThemeName = "light" | "dark";
