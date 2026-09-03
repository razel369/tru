import { colors as lightColors } from "./colors";

/**
 * PawPair — design themes.
 *
 * Light theme is the clay companion look. Dark keeps the same
 * identity (cream-tinted surfaces, coral primary, sage success)
 * with WCAG AA contrast.
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
  sky: string;
  skySoft: string;
  room: string;
}

export const lightTheme: ThemeColors = lightColors;

export const darkTheme: ThemeColors = {
  background: "#12181C",
  paper: "#1C262E",
  ink: "#F7F1E8",
  navy: "#7EB0D8",
  muted: "#8FA0AE",
  line: "#2A3844",
  coral: "#FF8F7C",
  coralSoft: "#3B2326",
  sage: "#7AB5A6",
  sageSoft: "#1F2E2C",
  butter: "#F2C268",
  butterSoft: "#3A2E1E",
  lavender: "#A89BCC",
  white: "#12181C",
  danger: "#E08585",
  sky: "#6AADDF",
  skySoft: "#1A2E3E",
  room: "#182028",
};

export function colorsFor(scheme: "light" | "dark"): ThemeColors {
  return scheme === "dark" ? darkTheme : lightTheme;
}

export type ThemeName = "light" | "dark";
