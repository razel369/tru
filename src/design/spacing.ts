/**
 * PawPair — 8-point spacing grid with 4-point optical exceptions.
 *
 * The original App.tsx used ad-hoc numeric values (4, 6, 8, 10, 12, 14, 16,
 * 20, 24, 28, 32, 40). We expose the 8-point ladder and a small `s()` helper
 * for the 4-point optical exceptions used in tight pills and small icons.
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
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

export type RadiusToken = keyof typeof radius;
