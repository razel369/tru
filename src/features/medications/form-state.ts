/**
 * PawPair — multi-step medication form state.
 *
 * docs/AAA-HANDOFF.md §8: "Use a native step flow rather than one
 * long form. Validate progressively and preserve unfinished
 * drafts."
 *
 * The flow is: Pet → Identity → Schedule → Inventory → Review.
 * The draft is exposed so the form can show a back button and
 * allow the user to return to a previous step.
 */

export type FormStep =
  | "pet"
  | "identity"
  | "schedule"
  | "inventory"
  | "review";

export const FORM_STEPS: FormStep[] = [
  "pet",
  "identity",
  "schedule",
  "inventory",
  "review",
];

export const FORM_STEP_TITLES: Record<FormStep, string> = {
  pet: "For which pet?",
  identity: "Medication",
  schedule: "When?",
  inventory: "Starting supply",
  review: "Review",
};

export interface MedicationDraft {
  petId: string;
  name: string;
  dosage: string;
  instructions: string;
  form: "tablet" | "capsule" | "liquid" | "drops" | "injection" | "topical";
  times: string[];
  startingSupply: number;
  supplyUnit: "tablets" | "doses" | "softgels" | "ml";
  paused?: boolean;
}

export const EMPTY_DRAFT: MedicationDraft = {
  petId: "",
  name: "",
  dosage: "",
  instructions: "Give with food",
  form: "tablet",
  times: ["08:00"],
  startingSupply: 30,
  supplyUnit: "tablets",
  paused: false,
};

export function validateStep(
  step: FormStep,
  draft: MedicationDraft,
): string | null {
  switch (step) {
    case "pet":
      if (!draft.petId) return "Please pick the pet this is for.";
      return null;
    case "identity":
      if (!draft.name.trim()) return "Add the medication name.";
      if (!draft.dosage.trim()) return "Add the dosage (e.g. 75 mg).";
      return null;
    case "schedule":
      if (draft.times.length === 0) return "Pick at least one time.";
      return null;
    case "inventory":
      if (draft.startingSupply < 0) return "Supply must be zero or more.";
      return null;
    case "review":
      return null;
  }
}
