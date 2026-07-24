import { describe, expect, it } from "vitest";

import type { ScheduledCare } from "../care/types";

import { buildWatchSnapshot } from "./snapshot";

describe("Apple Watch snapshot", () => {
  it("starts empty when the user has not configured care", () => {
    expect(buildWatchSnapshot([], null).items).toEqual([]);
  });

  it("serializes only user-defined care and keeps stable occurrence ids", () => {
    const occurrence = {
      id: "2026-07-24:pet-1:task-1:08:00",
      pet: { id: "pet-1", name: "Luna" },
      task: {
        id: "task-1",
        title: "Eye drops",
        category: "medication",
        instructions: "One drop",
      },
      scheduledTime: "08:00",
      status: "due",
    } as ScheduledCare;

    expect(
      buildWatchSnapshot([occurrence], "pet-1", new Date("2026-07-24T05:00:00Z")),
    ).toMatchObject({
      activePetId: "pet-1",
      generatedAt: "2026-07-24T05:00:00.000Z",
      items: [
        {
          id: occurrence.id,
          petName: "Luna",
          title: "Eye drops",
          status: "due",
        },
      ],
    });
  });
});
