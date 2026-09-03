import { describe, expect, it } from "vitest";

import { normalizePawPairSystemRoute } from "./routes";

describe("PawPair system routes", () => {
  it.each(["home", "add", "health"] as const)(
    "accepts the supported %s route",
    (route) => {
      expect(normalizePawPairSystemRoute(route)).toBe(route);
    },
  );

  it.each([null, undefined, "", "settings", 1, { route: "home" }])(
    "rejects unsupported route payloads",
    (route) => {
      expect(normalizePawPairSystemRoute(route)).toBeNull();
    },
  );
});
