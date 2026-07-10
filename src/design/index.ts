/**
 * PawPair — design system entry point.
 *
 * Stage 2 refactor: tokens and primitives now live under src/design/ and
 * src/components/primitives/ respectively. Screens consume them from here.
 */

export { colors } from "./colors";
export type { ColorToken } from "./colors";

export { fontFamily, typography } from "./typography";
export type { TypographyToken } from "./typography";

export { space, s, radius } from "./spacing";
export type { SpaceToken, RadiusToken } from "./spacing";

export { duration } from "./motion";
export type { DurationToken } from "./motion";

export { shadow } from "./shadows";
export type { ShadowToken } from "./shadows";

export { lightTheme, darkTheme, colorsFor } from "./themes";
export type { ThemeColors, ThemeName } from "./themes";
export { ThemeProvider, useTheme, __setThemeForTests } from "./ThemeProvider";
