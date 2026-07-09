/**
 * PawPair — design color tokens.
 *
 * Source of truth for the palette defined in docs/AAA-HANDOFF.md §3.
 * These values are the SAME as the inlined `COLORS` constant that lived
 * in App.tsx before the refactor; the goal of stage 2 is to extract them
 * without changing any visual output.
 *
 * Roles:
 * - background: warm cream app surface.
 * - paper:      slightly lifted card surface.
 * - navy / ink: text + chrome.
 * - coral:      primary action, attention, FAB.
 * - sage:       completion, safety, "given" state.
 * - butter:     warmth, secondary highlight.
 * - lavender:   pet-specific accent.
 * - danger:     destructive or error states.
 * - line:       hairline dividers.
 * - muted:      secondary text.
 */

export const colors = {
  background: "#F7F4EE",
  paper: "#FFFDF9",
  ink: "#1D3040",
  navy: "#243E52",
  muted: "#73828B",
  line: "#E7E2D9",
  coral: "#EF7B63",
  coralSoft: "#FBE1DA",
  sage: "#5D9387",
  sageSoft: "#DCECE7",
  butter: "#F6D58C",
  butterSoft: "#FCF1D4",
  lavender: "#9891C7",
  white: "#FFFFFF",
  danger: "#C95C5C",
} as const;

export type ColorToken = keyof typeof colors;
