import { describe, expect, it } from "vitest";

import type { Pet } from "../../types";

import { getPetCareStateValidationIssue } from "./state-validation";
import {
  isValidPetBirthDate,
  petAgeLabel,
  petAgeYearsFromBirthDate,
  petIdentitySummary,
} from "./pet-identity";

const now = new Date("2026-07-19T12:00:00.000Z");

function pet(overrides: Partial<Pet> = {}): Pet {
  return {
    age: 0,
    avatar: "luna",
    breed: "British Shorthair",
    color: "#AABBCC",
    id: "pet-1",
    medications: [],
    name: "Luna",
    species: "cat",
    ...overrides,
  };
}

describe("pet identity", () => {
  it("derives a precise, readable age from date of birth", () => {
    const luna = pet({ careProfile: { dateOfBirth: "2025-01-19" } });

    expect(petAgeLabel(luna, now)).toBe("18 months");
    expect(petAgeYearsFromBirthDate("2025-01-19", now)).toBeCloseTo(1.5, 1);
  });

  it("keeps approximate legacy ages as a complete fallback", () => {
    expect(petAgeLabel(pet({ age: 6.5 }), now)).toBe("6.5 years");
    expect(petAgeLabel(pet({ age: 0 }), now)).toBe("Age not recorded");
  });

  it("builds the same medical identity used by handoffs and vet briefs", () => {
    const luna = pet({
      careProfile: {
        dateOfBirth: "2025-01-19",
        reproductiveStatus: "altered",
        sex: "female",
      },
    });

    expect(petIdentitySummary(luna, { includeBirthDate: true })).toBe(
      "18 months / Born Jan 19, 2025 / Female / Spayed / neutered",
    );
  });

  it("rejects impossible, future and implausibly old birth dates", () => {
    expect(isValidPetBirthDate("2026-02-30", now)).toBe(false);
    expect(isValidPetBirthDate("2026-07-20", now)).toBe(false);
    expect(isValidPetBirthDate("1700-01-01", now)).toBe(false);
    expect(isValidPetBirthDate("2024-02-29", now)).toBe(true);
  });

  it("validates the optional identity fields without rejecting old profiles", () => {
    const validPet = pet({
      careProfile: {
        dateOfBirth: "2024-02-29",
        reproductiveStatus: "altered",
        sex: "female",
      },
    });
    const state = {
      activePetId: validPet.id,
      healthRecords: [],
      logs: [],
      pets: [validPet],
      tasks: [],
      version: 1,
    } as const;

    expect(getPetCareStateValidationIssue(state)).toBeNull();
    expect(
      getPetCareStateValidationIssue({
        ...state,
        pets: [{ ...validPet, careProfile: { sex: "invalid" } }],
      }),
    ).toContain("failed schema validation");
    expect(
      getPetCareStateValidationIssue({
        ...state,
        pets: [{ ...validPet, careProfile: { dateOfBirth: "2999-01-01" } }],
      }),
    ).toContain("failed schema validation");
  });
});
