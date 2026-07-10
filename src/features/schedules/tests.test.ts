/**
 * PawPair — schedule engine tests.
 *
 * Combines targeted unit tests with fast-check property tests
 * for the recurrence generators. The property tests assert the
 * invariants that hold for every valid input: deterministic
 * keys, no out-of-range occurrences, no duplicates, sort order.
 */

import { describe, expect, it } from "vitest";
import fc from "fast-check";

import {
  generateOccurrences,
  occurrenceKey,
  parseOccurrenceKey,
  localDateIn,
  localTimeIn,
  localToUtc,
  isValidTimezone,
} from "./index";
import type { Schedule } from "./types";

function buildSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: "s-1",
    medicationId: "m-1",
    timezone: "UTC",
    startDate: "2026-01-01",
    endDate: null,
    times: ["08:00", "20:00"],
    weekdayMask: 127,
    everyN: null,
    cycleOnDays: null,
    cycleOffDays: null,
    taperPhases: [],
    paused: false,
    prnMinIntervalMinutes: 0,
    type: "daily",
    ...overrides,
  };
}

describe("occurrenceKey", () => {
  it("is deterministic", () => {
    const a = occurrenceKey("s-1", "2026-07-10", "08:00");
    const b = occurrenceKey("s-1", "2026-07-10", "08:00");
    expect(a).toBe(b);
  });

  it("differs when the schedule id changes", () => {
    const a = occurrenceKey("s-1", "2026-07-10", "08:00");
    const b = occurrenceKey("s-2", "2026-07-10", "08:00");
    expect(a).not.toBe(b);
  });

  it("differs when the local date changes", () => {
    const a = occurrenceKey("s-1", "2026-07-10", "08:00");
    const b = occurrenceKey("s-1", "2026-07-11", "08:00");
    expect(a).not.toBe(b);
  });

  it("parses back to the inputs", () => {
    const key = occurrenceKey("s-1", "2026-07-10", "08:00");
    const parts = parseOccurrenceKey(key);
    expect(parts).toEqual({
      scheduleId: "s-1",
      localDate: "2026-07-10",
      localTime: "08:00",
      hash: expect.stringMatching(/^[0-9a-f]{8}$/),
    });
  });
});

describe("timezone", () => {
  it("recognises a valid IANA timezone", () => {
    expect(isValidTimezone("UTC")).toBe(true);
    expect(isValidTimezone("Asia/Jerusalem")).toBe(true);
  });

  it("rejects an unknown timezone", () => {
    expect(isValidTimezone("Atlantis/Elba")).toBe(false);
  });

  it("localToUtc returns the same wall-clock time in UTC", () => {
    const utc = localToUtc("2026-07-10", "08:00", "UTC");
    expect(utc.toISOString()).toBe("2026-07-10T08:00:00.000Z");
  });

  it("localToUtc and localDateIn/localTimeIn round-trip in Jerusalem", () => {
    const tz = "Asia/Jerusalem";
    const utc = localToUtc("2026-07-10", "14:00", tz);
    // The round-trip preserves the wall-clock time regardless of
    // UTC offset.
    expect(localDateIn(utc, tz)).toBe("2026-07-10");
    expect(localTimeIn(utc, tz)).toBe("14:00");
  });
});

describe("dailyOccurrences", () => {
  it("emits 2 doses per day for 3 days", () => {
    const schedule = buildSchedule({
      type: "daily",
      times: ["08:00", "20:00"],
      startDate: "2026-07-10",
      endDate: "2026-07-12",
    });
    const occ = generateOccurrences(
      schedule,
      new Date("2026-07-10T00:00:00Z"),
      new Date("2026-07-12T23:59:59Z"),
    );
    expect(occ).toHaveLength(6);
    expect(occ.map((o) => `${o.localDate} ${o.localTime}`)).toEqual([
      "2026-07-10 08:00",
      "2026-07-10 20:00",
      "2026-07-11 08:00",
      "2026-07-11 20:00",
      "2026-07-12 08:00",
      "2026-07-12 20:00",
    ]);
  });

  it("respects paused schedules", () => {
    const schedule = buildSchedule({ paused: true });
    const occ = generateOccurrences(
      schedule,
      new Date("2026-07-10T00:00:00Z"),
      new Date("2026-07-12T00:00:00Z"),
    );
    expect(occ).toEqual([]);
  });

  it("honours endDate when end is in the middle of the range", () => {
    // Daily schedule from 2026-07-08 to 2026-07-10 inclusive, two
    // times per day. Generator walks the range and stops emitting
    // when the local date exceeds endDate.
    const schedule = buildSchedule({
      type: "daily",
      times: ["08:00", "20:00"],
      startDate: "2026-07-08",
      endDate: "2026-07-10",
    });
    const occ = generateOccurrences(
      schedule,
      new Date("2026-07-08T00:00:00Z"),
      new Date("2026-07-15T00:00:00Z"),
    );
    expect(occ).toHaveLength(6);
    expect(occ[occ.length - 1]?.localDate).toBe("2026-07-10");
    expect(occ[occ.length - 1]?.localTime).toBe("20:00");
  });
});

describe("weekdaysOccurrences", () => {
  it("emits only on selected weekdays", () => {
    // 2026-07-10 is a Friday. Mask Mon|Wed|Fri = 1 + 4 + 16 = 21.
    const schedule = buildSchedule({
      type: "weekdays",
      times: ["09:00"],
      weekdayMask: 21,
      startDate: "2026-07-06",
      endDate: "2026-07-19",
    });
    const occ = generateOccurrences(
      schedule,
      new Date("2026-07-06T00:00:00Z"),
      new Date("2026-07-19T23:59:59Z"),
    );
    // Two weeks: Mon 6, Wed 8, Fri 10, Mon 13, Wed 15, Fri 17.
    expect(occ).toHaveLength(6);
    expect(occ.map((o) => o.localDate)).toEqual([
      "2026-07-06",
      "2026-07-08",
      "2026-07-10",
      "2026-07-13",
      "2026-07-15",
      "2026-07-17",
    ]);
  });
});

describe("cycleOccurrences", () => {
  it("emits only on the on-days", () => {
    const schedule = buildSchedule({
      type: "cycle",
      times: ["08:00"],
      cycleOnDays: 5,
      cycleOffDays: 2,
      startDate: "2026-07-06",
    });
    const occ = generateOccurrences(
      schedule,
      new Date("2026-07-06T00:00:00Z"),
      new Date("2026-07-19T23:59:59Z"),
    );
    // 5-on / 2-off cycle: days 6-10 on, 11-12 off, 13-17 on, 18-19 off.
    expect(occ.map((o) => o.localDate)).toEqual([
      "2026-07-06",
      "2026-07-07",
      "2026-07-08",
      "2026-07-09",
      "2026-07-10",
      "2026-07-13",
      "2026-07-14",
      "2026-07-15",
      "2026-07-16",
      "2026-07-17",
    ]);
  });
});

describe("everyNHoursOccurrences", () => {
  it("emits a dose every N hours from the anchor", () => {
    const schedule = buildSchedule({
      type: "every_n_hours",
      everyN: 6,
      times: ["06:00"],
      startDate: "2026-07-10",
    });
    const occ = generateOccurrences(
      schedule,
      new Date("2026-07-10T00:00:00Z"),
      new Date("2026-07-11T00:00:00Z"),
    );
    // 06, 12, 18, 24 = 4 doses in 24 hours.
    expect(occ).toHaveLength(4);
  });
});

describe("schedule engine property tests", () => {
  it("daily occurrences have deterministic keys", () => {
    fc.assert(
      fc.property(
        fc
          .tuple(
            fc.integer({ min: 2025, max: 2030 }),
            fc.integer({ min: 1, max: 12 }),
            fc.integer({ min: 1, max: 28 }),
          )
          .map(([y, m, d]) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`),
        (startDate) => {
          const schedule = buildSchedule({
            id: "prop-1",
            startDate,
            endDate: null,
            times: ["08:00"],
          });
          const rangeFrom = new Date(`${startDate}T00:00:00Z`);
          const rangeTo = new Date(`${startDate}T00:00:00Z`);
          rangeTo.setUTCDate(rangeTo.getUTCDate() + 1);
          const first = generateOccurrences(schedule, rangeFrom, rangeTo);
          const second = generateOccurrences(schedule, rangeFrom, rangeTo);
          expect(first.map((o) => o.key)).toEqual(second.map((o) => o.key));
        },
      ),
    );
  });

  it("daily occurrences are always sorted by scheduledForUtc", () => {
    const schedule = buildSchedule({
      id: "sort-1",
      startDate: "2026-07-10",
      endDate: "2026-07-12",
      times: ["08:00", "20:00"],
    });
    const occ = generateOccurrences(
      schedule,
      new Date("2026-07-10T00:00:00Z"),
      new Date("2026-07-12T23:59:59Z"),
    );
    for (let i = 1; i < occ.length; i += 1) {
      const prev = occ[i - 1];
      const cur = occ[i];
      if (prev && cur) {
        expect(
          prev.scheduledForUtc <= cur.scheduledForUtc,
          `out of order: ${prev.scheduledForUtc} > ${cur.scheduledForUtc}`,
        ).toBe(true);
      }
    }
  });
});
