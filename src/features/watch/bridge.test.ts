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

  it("keeps actionable care ahead of completed history on the small watch list", () => {
    const occurrence = (
      id: string,
      scheduledTime: string,
      status: ScheduledCare["status"],
    ) =>
      ({
        id,
        pet: { id: "pet-1", name: "Luna" },
        task: {
          id: `task-${id}`,
          title: id,
          category: "feeding",
          instructions: "",
        },
        scheduledTime,
        status,
      }) as ScheduledCare;
    const completed = Array.from({ length: 12 }, (_, index) =>
      occurrence(`done-${index}`, `${String(index).padStart(2, "0")}:00`, "done"),
    );
    const due = occurrence("due-now", "18:00", "due");
    const upcoming = occurrence("next", "19:00", "upcoming");

    const snapshot = buildWatchSnapshot(
      [...completed, upcoming, due],
      "pet-1",
      new Date("2026-07-24T05:00:00Z"),
    );

    expect(snapshot.items).toHaveLength(12);
    expect(snapshot.items.slice(0, 2).map((item) => item.id)).toEqual([
      "due-now",
      "next",
    ]);
  });
});
