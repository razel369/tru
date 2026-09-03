import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { clock } from "../../data/database/types";
import { __resetNotificationStateForTests, __setSchedulingBackend, buildHealthReport } from "./service";
import { scheduleAllPets, DEFAULT_HORIZON_DAYS } from "./scheduler";
import type { Pet } from "../../types";

function makePet(): Pet {
  return {
    id: "milo",
    name: "Milo",
    species: "dog",
    breed: "Golden retriever",
    age: 9,
    avatar: "milo",
    color: "#F3B66D",
    medications: [
      {
        id: "carprofen",
        name: "Carprofen",
        dosage: "75 mg",
        instructions: "Give with food",
        form: "tablet",
        times: ["08:00", "20:00"],
        stock: 14,
        stockUnit: "tablets",
        color: "#ED7C62",
      },
    ],
  };
}

describe("scheduleAllPets", () => {
  beforeEach(() => {
    clock.__setNow(() => new Date("2026-07-10T00:00:00.000Z"));
  });
  afterEach(() => {
    clock.__reset();
    __resetNotificationStateForTests();
    __setSchedulingBackend({
      async schedule() {
        return null;
      },
      async cancel() {
        return;
      },
      async cancelByScheduleId() {
        return 0;
      },
    });
  });

  it("uses the configured scheduling backend", async () => {
    let count = 0;
    __setSchedulingBackend({
      async schedule() {
        count += 1;
        return `p-${count}`;
      },
      async cancel() {
        return;
      },
      async cancelByScheduleId() {
        return 0;
      },
    });
    const from = new Date("2026-07-10T00:00:00.000Z");
    const notifications = await scheduleAllPets([makePet()], from, 7);
    expect(notifications.length).toBeGreaterThan(0);
    const report = await buildHealthReport("granted");
    expect(report.scheduled).toBeGreaterThan(0);
  });

  it("uses the default horizon when none is given", async () => {
    expect(DEFAULT_HORIZON_DAYS).toBe(7);
  });

  it("filters out pets with no medications", async () => {
    const emptyPet: Pet = { ...makePet(), medications: [] };
    const notifications = await scheduleAllPets(
      [emptyPet],
      new Date("2026-07-10T00:00:00.000Z"),
      1,
    );
    expect(notifications).toEqual([]);
  });
});
