export const PAWPAIR_SYSTEM_ROUTES = ["home", "add", "health"] as const;

export type PawPairSystemRoute = (typeof PAWPAIR_SYSTEM_ROUTES)[number];

export function normalizePawPairSystemRoute(
  value: unknown,
): PawPairSystemRoute | null {
  return typeof value === "string" &&
    (PAWPAIR_SYSTEM_ROUTES as readonly string[]).includes(value)
    ? (value as PawPairSystemRoute)
    : null;
}
