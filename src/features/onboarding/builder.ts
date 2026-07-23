import type { Pet, Medication } from "../../types";

import type { OnboardingMedicationDraft, OnboardingPetDraft } from "./types";

/**
 * Convert an OnboardingPetDraft into the existing `Pet` shape used
 * by TodayScreen / PetsScreen. Stage 7 will replace this with a
 * proper PetsRepository call; for now we keep the legacy shape so
 * the rest of the app continues to work unchanged.
 */
export function buildPetFromDraft(
  draft: OnboardingPetDraft,
  petId: string,
): Pet {
  return {
    id: petId,
    name: draft.name,
    species: draft.species,
    breed: draft.breed ?? "",
    age: draft.ageYears ?? 0,
    avatar: draft.avatarSeed,
    visualProfile: draft.visualProfile,
    color: draft.accentColor,
    medications: [],
  };
}

export function buildMedicationFromDraft(
  draft: OnboardingMedicationDraft,
  medicationId: string,
  color: string,
): Medication {
  return {
    id: medicationId,
    name: draft.name,
    dosage: draft.dosageText,
    instructions: draft.instructions ?? "Follow veterinary instructions",
    form: draft.form,
    times: draft.times,
    stock: draft.startingSupply,
    stockUnit: draft.supplyUnit,
    color,
  };
}
