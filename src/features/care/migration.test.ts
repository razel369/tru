import { describe, expect, it } from "vitest";

import type { DoseLog, Pet } from "../../types";

import { emptyCareState, migrateLegacyData } from "./migration";

describe("legacy medication migration", () => {
  it("starts with no pets, care moments, logs or health records", () => {
    expect(emptyCareState()).toEqual({
      version: 1,
      pets: [],
      tasks: [],
      logs: [],
      healthRecords: [],
      activePetId: null,
    });
  });

  it("does not invent care moments for a pet without medications", () => {
    const pet: Pet = {
      id: "new-pet",
      name: "Pepper",
      species: "cat",
      breed: "Sphynx",
      age: 2,
      avatar: "luna",
      color: "#9B91C8",
      medications: [],
    };

    const state = migrateLegacyData([pet], []);

    expect(state.pets).toEqual([pet]);
    expect(state.tasks).toEqual([]);
    expect(state.logs).toEqual([]);
    expect(state.healthRecords).toEqual([]);
  });

  it("preserves pets, medications and completed dose history", () => {
    const pet: Pet = {
      id: "milo",
      name: "Milo",
      species: "dog",
      breed: "Golden Retriever",
      age: 9,
      avatar: "milo",
      color: "#F3B66D",
      medications: [
        {
          id: "carprofen",
          name: "Carprofen",
          dosage: "75 mg",
          instructions: "With food",
          form: "tablet",
          times: ["08:00", "20:00"],
          stock: 12,
          stockUnit: "tablets",
          color: "#ED7C62",
        },
      ],
    };
    const doseLog: DoseLog = {
      id: "legacy-log",
      petId: pet.id,
      medicationId: "carprofen",
      date: "2026-07-13",
      scheduledTime: "08:00",
      status: "given",
      completedAt: "2026-07-13T08:01:00.000Z",
      completedBy: "You",
    };

    const state = migrateLegacyData([pet], [doseLog]);
    const medicationTask = state.tasks.find(
      (task) => task.category === "medication",
    );
    expect(state.pets).toEqual([pet]);
    expect(state.tasks.filter((task) => task.category !== "medication")).toHaveLength(0);
    expect(medicationTask?.title).toBe("Carprofen");
    expect(medicationTask?.schedule.times).toEqual(["08:00", "20:00"]);
    expect(state.logs[0]).toMatchObject({
      taskId: medicationTask?.id,
      status: "done",
      completedBy: "You",
    });
    expect(state.activePetId).toBe("milo");
  });
});
