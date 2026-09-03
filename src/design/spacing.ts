/**
 * PawPair — 8-point spacing grid with clay-friendly radii.
 */

export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export type SpaceToken = keyof typeof space;

/** Optical half-step used for icons inside pills. */
export const s = (n: number): number => n;

export const radius = {
  pill: 999,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 28,
  xxl: 36,
  clay: 32,
} as const;

export type RadiusToken = keyof typeof radius;
