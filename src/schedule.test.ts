import { describe, expect, it } from "vitest";

import {
  adherencePercent,
  buildSchedule,
  createDoseLog,
  dateKey,
  DEMO_PETS,
  formatTime,
  timeToMinutes,
} from "./schedule";

describe("medication schedule", () => {
  const date = new Date(2026, 6, 9, 8, 0);

  it("builds and sorts every scheduled dose", () => {
    const schedule = buildSchedule(DEMO_PETS, [], date, 8 * 60);

    expect(schedule).toHaveLength(5);
    expect(schedule[0]?.scheduledTime).toBe("07:30");
    expect(schedule[4]?.scheduledTime).toBe("20:00");
    expect(schedule[1]?.status).toBe("due");
  });

  it("creates a caregiver-attributed dose log", () => {
    const dose = buildSchedule(DEMO_PETS, [], date, 8 * 60)[1]!;
    const log = createDoseLog(dose, "given", "Maya", date);

    expect(log.date).toBe("2026-07-09");
    expect(log.completedBy).toBe("Maya");
    expect(log.status).toBe("given");
  });

  it("uses existing logs when rebuilding the day", () => {
    const dose = buildSchedule(DEMO_PETS, [], date, 8 * 60)[1]!;
    const log = createDoseLog(dose, "given", "Maya", date);
    const rebuilt = buildSchedule(DEMO_PETS, [log], date, 8 * 60);

    expect(rebuilt[1]?.status).toBe("given");
    expect(rebuilt[1]?.log?.completedBy).toBe("Maya");
    expect(adherencePercent(rebuilt)).toBe(100);
  });

  it("formats dates and times deterministically", () => {
    expect(dateKey(date)).toBe("2026-07-09");
    expect(timeToMinutes("19:30")).toBe(1170);
    expect(formatTime("19:30")).toBe("7:30 PM");
  });
});
