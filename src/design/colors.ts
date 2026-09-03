/**
 * PawPair — clay companion palette.
 *
 * Soft cream surfaces, sky-blue brand, coral action, sage success.
 * Token names stay stable so screens can adopt the new look without
 * renaming every import.
 */

export const colors = {
  background: "#F7F1E8",
  paper: "#FFFCF7",
  ink: "#2A3A4A",
  navy: "#3D6F9C",
  muted: "#8A97A3",
  line: "#E8DFD2",
  coral: "#FF7F6A",
  coralSoft: "#FFE4DE",
  sage: "#5D9387",
  sageSoft: "#DCECE7",
  butter: "#F6D58C",
  butterSoft: "#FCF1D4",
  lavender: "#A89BCC",
  white: "#FFFFFF",
  danger: "#C95C5C",
  /** Soft sky brand accent (wordmark "Paw", active chrome). */
  sky: "#5B9BD5",
  skySoft: "#D6E8F7",
  /** Warm room wash behind the companion scene. */
  room: "#EDE4D6",
} as const;

export type ColorToken = keyof typeof colors;
