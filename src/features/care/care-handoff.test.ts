import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Pet } from "../../types";

import {
  buildCareHandoffHtml,
  buildCareHandoffText,
  type CareHandoffOptions,
} from "./care-handoff";
import type { CareTask, HealthRecord } from "./types";

const pet: Pet = {
  age: 6,
  avatar: "luna",
  breed: "British Shorthair",
  careProfile: {
    allergies: "SECRET-ALLERGY",
    caregiverNotes: "Keep the blue blanket nearby",
    diet: "Wet food only",
    emergencyContactName: "SECRET-EMERGENCY",
    emergencyContactPhone: "+1 555 0102",
    microchipId: "SECRET-CHIP",
    veterinarianName: "SECRET-VET",
    veterinarianPhone: "+1 555 0101",
  },
  color: "#999999",
  id: "pet-luna",
  medications: [],
  name: "Luna",
  species: "cat",
};

const noSections: CareHandoffOptions = {
  appointments: false,
  contacts: false,
  health: false,
  medications: false,
  routine: false,
};

function task(
  id: string,
  overrides: Partial<CareTask> = {},
): CareTask {
  return {
    category: "feeding",
    createdAt: "2026-07-01T00:00:00.000Z",
    enabled: true,
    id,
    instructions: "Use the clean bowl",
    petId: pet.id,
    schedule: { frequency: "daily", times: ["08:00"] },
    title: `Task ${id}`,
    ...overrides,
  };
}

function record(index: number, overrides: Partial<HealthRecord> = {}): HealthRecord {
  return {
    createdAt: "2026-07-01T00:00:00.000Z",
    date: `2026-07-${String(index).padStart(2, "0")}`,
    id: `record-${index}`,
    petId: pet.id,
    title: `Health record ${index}`,
    type: "note",
    ...overrides,
  };
}

describe("care handoff privacy contract", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("escapes user-authored markup in the printable HTML", () => {
    const unsafePet = {
      ...pet,
      name: 'Luna <script>alert("x")</script> & friends',
    };
    const unsafeTask = task("unsafe", {
      instructions: "Use <b>one</b> scoop & rinse",
      title: "Breakfast </section><script>bad()</script>",
    });
    const html = buildCareHandoffHtml(unsafePet, [unsafeTask], [], {
      ...noSections,
      routine: true,
    });

    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).not.toContain("<script>bad()</script>");
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; friends");
    expect(html).toContain("Use &lt;b&gt;one&lt;/b&gt; scoop &amp; rinse");
  });

  it("does not leak unselected medical, contact, appointment, or health data", () => {
    const tasks = [
      task("routine"),
      task("medication", {
        category: "medication",
        title: "SECRET-MEDICATION",
      }),
      task("appointment", {
        category: "appointment",
        schedule: {
          date: "2026-07-20",
          frequency: "once",
          times: ["09:00"],
        },
        title: "SECRET-APPOINTMENT",
      }),
    ];
    const records = [record(19, { title: "SECRET-HEALTH" })];
    const options = { ...noSections, routine: true };

    for (const document of [
      buildCareHandoffHtml(pet, tasks, records, options),
      buildCareHandoffText(pet, tasks, records, options),
    ]) {
      expect(document).toContain("Task routine");
      expect(document).toContain("Wet food only");
      expect(document).not.toContain("SECRET-ALLERGY");
      expect(document).not.toContain("SECRET-MEDICATION");
      expect(document).not.toContain("SECRET-APPOINTMENT");
      expect(document).not.toContain("SECRET-HEALTH");
      expect(document).not.toContain("SECRET-CHIP");
      expect(document).not.toContain("SECRET-VET");
      expect(document).not.toContain("SECRET-EMERGENCY");
    }
  });

  it("includes only upcoming appointments and the latest twelve health entries", () => {
    const appointments = [
      task("past", {
        category: "appointment",
        schedule: { date: "2026-07-18", frequency: "once", times: ["10:00"] },
        title: "PAST-APPOINTMENT",
      }),
      task("today", {
        category: "appointment",
        schedule: { date: "2026-07-19", frequency: "once", times: ["16:00"] },
        title: "TODAY-APPOINTMENT",
      }),
      task("future", {
        category: "appointment",
        schedule: { date: "2026-07-20", frequency: "once", times: ["09:00"] },
        title: "FUTURE-APPOINTMENT",
      }),
    ];
    const records = Array.from({ length: 14 }, (_, offset) => record(offset + 1));
    const text = buildCareHandoffText(pet, appointments, records, {
      ...noSections,
      appointments: true,
      health: true,
    });

    expect(text).not.toContain("PAST-APPOINTMENT");
    expect(text).toContain("TODAY-APPOINTMENT");
    expect(text).toContain("FUTURE-APPOINTMENT");
    expect(text).not.toContain("Health record 1\n");
    expect(text).not.toContain("Health record 2\n");
    expect(text).toContain("Health record 3");
    expect(text).toContain("Health record 14");
  });
});
