import type { BreedVisualProfile } from "../../types";

/**
 * PawPair — onboarding state machine.
 *
 * docs/AAA-HANDOFF.md §8 describes the onboarding as:
 *   1. Brand moment with the real PawPair icon.
 *   2. Explain shared confirmation, not a list of generic features.
 *   3. Create the first pet with photo or generated portrait.
 *   4. Add the first medication from veterinary instructions.
 *   5. Preview the next scheduled dose.
 *   6. Ask for notifications contextually.
 *   7. Offer caregiver invite after value is established.
 *
 * We model the state as a discriminated union so each step is
 * a self-contained screen with the data it needs. The flow is
 * reversible up to the "complete" state.
 */

export type OnboardingStep =
  | "welcome"
  | "createPet"
  | "createMedication"
  | "previewDose"
  | "complete";

export interface OnboardingPetDraft {
  name: string;
  species: "dog" | "cat" | "other";
  breed?: string;
  ageYears?: number;
  /** Avatar seed: 'milo' | 'luna' | 'generated' | a custom key. */
  avatarSeed: string;
  accentColor: string;
  visualProfile?: BreedVisualProfile;
}

export type MedicationForm =
  | "tablet"
  | "capsule"
  | "liquid"
  | "drops"
  | "injection"
  | "topical";

export interface OnboardingMedicationDraft {
  petId: string;
  name: string;
  form: MedicationForm;
  dosageText: string;
  instructions?: string;
  /** Wall-clock schedule times in HH:MM (24h). v1 supports daily-at-times. */
  times: string[];
  startingSupply: number;
  supplyUnit: "tablets" | "doses" | "softgels" | "ml";
}

export interface OnboardingState {
  step: OnboardingStep;
  pet?: OnboardingPetDraft;
  medication?: OnboardingMedicationDraft;
}

export const INITIAL_ONBOARDING: OnboardingState = { step: "welcome" };
