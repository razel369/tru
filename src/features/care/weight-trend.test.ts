import { describe, expect, it } from "vitest";

import type { HealthRecord } from "./types";
import { buildWeightTrend } from "./weight-trend";

function weight(
  id: string,
  date: string,
  value: string,
  unit = "kg",
  createdAt = `${date}T08:00:00.000Z`,
): HealthRecord {
  return {
    createdAt,
    date,
    id,
    petId: "pet-1",
    title: "Weight",
    type: "weight",
    unit,
    value,
  };
}

describe("buildWeightTrend", () => {
  it("builds a chronological seven-point trend in the latest unit", () => {
    const records = Array.from({ length: 9 }, (_, index) =>
      weight(
        `weight-${index}`,
        `2026-07-${String(index + 1).padStart(2, "0")}`,
        String(20 + index / 2),
      ),
    );
    records.push(weight("old-pounds", "2026-06-30", "44", "lb"));

    const trend = buildWeightTrend(records);

    expect(trend?.points).toHaveLength(7);
    expect(trend?.points[0]?.date).toBe("2026-07-03");
    expect(trend?.points.at(-1)?.date).toBe("2026-07-09");
    expect(trend?.latestValue).toBe(24);
    expect(trend?.delta).toBe(3);
    expect(trend?.unit).toBe("kg");
    expect(trend?.points.at(-1)?.barHeight).toBe(62);
  });

  it("keeps only the newest valid reading for each day", () => {
    const trend = buildWeightTrend([
      weight("first", "2026-07-10", "20"),
      weight("older-duplicate", "2026-07-11", "21", "kg", "2026-07-11T08:00:00.000Z"),
      weight("newer-duplicate", "2026-07-11", "21,5", "KG", "2026-07-11T18:00:00.000Z"),
      weight("invalid", "2026-07-12", "twenty two"),
    ]);

    expect(trend?.points.map((point) => point.value)).toEqual([20, 21.5]);
    expect(trend?.accessibleSummary).toContain("1.5 KG up");
  });

  it("does not show a misleading chart without two comparable readings", () => {
    expect(buildWeightTrend([weight("only", "2026-07-10", "20")])).toBeNull();
    expect(
      buildWeightTrend([
        weight("kg", "2026-07-10", "20", "kg"),
        weight("lb", "2026-07-11", "44", "lb"),
      ]),
    ).toBeNull();
  });

  it("renders equal readings at a calm middle height", () => {
    const trend = buildWeightTrend([
      weight("first", "2026-07-10", "20"),
      weight("second", "2026-07-11", "20"),
    ]);

    expect(trend?.delta).toBe(0);
    expect(trend?.points.every((point) => point.barHeight === 40)).toBe(true);
  });
});
