import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { clock } from "./types";
import { uuid } from "./uuid";

describe("clock", () => {
  const fixed = new Date("2026-07-10T08:00:00.000Z");

  beforeEach(() => {
    clock.__setNow(() => fixed);
  });

  afterEach(() => {
    clock.__reset();
  });

  it("returns the injected instant", () => {
    expect(clock.now().toISOString()).toBe("2026-07-10T08:00:00.000Z");
  });

  it("returns the injected instant as ISO", () => {
    expect(clock.nowIso()).toBe("2026-07-10T08:00:00.000Z");
  });
});

describe("uuid", () => {
  it("generates v4-shaped identifiers", () => {
    const id = uuid();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("generates unique identifiers", () => {
    const ids = new Set(Array.from({ length: 256 }, () => uuid()));
    expect(ids.size).toBe(256);
  });
});
