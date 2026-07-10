import { describe, expect, it } from "vitest";

import { detectConflict, legacyLogToRow } from "./conflict";
import type { DoseEventRow } from "./types";

const ROW = (overrides: Partial<DoseEventRow> = {}): DoseEventRow => ({
  id: "e-1",
  scheduled_dose_id: "sd-1",
  status: "given",
  completed_at_utc: "2026-07-10T08:04:00.000Z",
  completed_by_user_id: "u-1",
  note: null,
  correction_of_event_id: null,
  ...overrides,
});

describe("detectConflict", () => {
  it("returns null when there is at most one terminal event", () => {
    expect(
      detectConflict({
        scheduledDoseId: "sd-1",
        events: [ROW()],
        displayNameFor: (id) => `User ${id}`,
      }),
    ).toBeNull();
  });

  it("returns the first two events when there is a conflict", () => {
    const first = ROW({
      id: "e-1",
      completed_at_utc: "2026-07-10T08:04:00.000Z",
      completed_by_user_id: "u-1",
    });
    const second = ROW({
      id: "e-2",
      completed_at_utc: "2026-07-10T08:05:00.000Z",
      completed_by_user_id: "u-2",
    });
    const conflict = detectConflict({
      scheduledDoseId: "sd-1",
      events: [second, first],
      displayNameFor: (id) => `User ${id}`,
    });
    expect(conflict).not.toBeNull();
    expect(conflict?.firstEvent.id).toBe("e-1");
    expect(conflict?.firstEvent.completedByUserId).toBe("u-1");
    expect(conflict?.secondEvent.id).toBe("e-2");
    expect(conflict?.secondEvent.completedByUserId).toBe("u-2");
  });

  it("ignores corrected events (correction_of_event_id is set)", () => {
    const original = ROW({ id: "e-1" });
    const correction = ROW({
      id: "e-2",
      correction_of_event_id: "e-1",
    });
    expect(
      detectConflict({
        scheduledDoseId: "sd-1",
        events: [original, correction],
        displayNameFor: (id) => `User ${id}`,
      }),
    ).toBeNull();
  });
});

describe("legacyLogToRow", () => {
  it("maps a legacy log to a dose_events row", () => {
    const row = legacyLogToRow({
      id: "l-1",
      petId: "milo",
      medicationId: "carprofen",
      date: "2026-07-10",
      scheduledTime: "08:00",
      status: "given",
      completedAt: "2026-07-10T08:04:00.000Z",
      completedBy: "Maya",
    });
    expect(row.id).toBe("l-1");
    expect(row.scheduled_dose_id).toBe(
      "milo::carprofen::2026-07-10::08:00",
    );
    expect(row.status).toBe("given");
    expect(row.completed_by_user_id).toBeNull();
  });
});
