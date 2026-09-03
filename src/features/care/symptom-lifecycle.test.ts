import { describe, expect, it } from "vitest";

import type { Pet } from "../../types";

import { buildCareHandoffText } from "./care-handoff";
import { buildHealthPassport, buildVetBriefText } from "./health-passport";
import { getPetCareStateValidationIssue } from "./state-validation";
import type { HealthRecord, PetCareState } from "./types";

const pet: Pet = {
  age: 4,
  avatar: "milo",
  breed: "Beagle",
  color: "#AABBCC",
  id: "pet-1",
  medications: [],
  name: "Milo",
  species: "dog",
};

function symptom(
  id: string,
  overrides: Partial<HealthRecord> = {},
): HealthRecord {
  return {
    createdAt: "2026-07-10T08:00:00.000Z",
    date: "2026-07-10",
    id,
    notes: "Observed after breakfast",
    petId: pet.id,
    severity: "moderate",
    title: "Cough",
    type: "symptom",
    ...overrides,
  };
}

function state(records: HealthRecord[]): PetCareState {
  return {
    activePetId: pet.id,
    healthRecords: records,
    logs: [],
    pets: [pet],
    tasks: [],
    version: 1,
  };
}

describe("symptom lifecycle", () => {
  it("separates ongoing urgent signals from resolved history", () => {
    const records = [
      symptom("ongoing", { severity: "urgent", title: "Breathing change" }),
      symptom("resolved", { resolvedDate: "2026-07-12" }),
    ];

    const passport = buildHealthPassport(pet, [], records);

    expect(passport.activeSymptomCount).toBe(1);
    expect(passport.urgentSymptomCount).toBe(1);
    expect(passport.passportLabel).toBe("Ongoing urgent signal");
  });

  it("includes ongoing and resolved status in both share formats", () => {
    const records = [
      symptom("ongoing"),
      symptom("resolved", { resolvedDate: "2026-07-12" }),
    ];
    const handoff = buildCareHandoffText(pet, [], records, {
      appointments: false,
      contacts: false,
      health: true,
      medications: false,
      routine: false,
    });
    const vetBrief = buildVetBriefText(pet, [], records);

    expect(handoff).toContain("Ongoing");
    expect(handoff).toContain("Resolved Jul 12, 2026");
    expect(vetBrief).toContain("Status: ongoing");
    expect(vetBrief).toContain("Resolved: Jul 12, 2026");
  });

  it("accepts valid resolution dates and rejects contradictory records", () => {
    expect(
      getPetCareStateValidationIssue(
        state([symptom("resolved", { resolvedDate: "2026-07-12" })]),
      ),
    ).toBeNull();
    expect(
      getPetCareStateValidationIssue(
        state([symptom("before", { resolvedDate: "2026-07-09" })]),
      ),
    ).toContain("failed schema validation");
    expect(
      getPetCareStateValidationIssue(
        state([
          symptom("wrong-type", {
            resolvedDate: "2026-07-12",
            type: "note",
          }),
        ]),
      ),
    ).toContain("failed schema validation");
  });
});
