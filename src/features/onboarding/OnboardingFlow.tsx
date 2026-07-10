import type { ImageSourcePropType } from "react-native";
import { useCallback, useState } from "react";

import type { Pet } from "../../types";

import { AddMedicationOnboardingScreen } from "./AddMedicationOnboardingScreen";
import { AddPetScreen } from "./AddPetScreen";
import { PreviewDoseScreen } from "./PreviewDoseScreen";
import { WelcomeScreen } from "./WelcomeScreen";
import type {
  OnboardingMedicationDraft,
  OnboardingPetDraft,
} from "./types";

export interface OnboardingFlowProps {
  appIcon: ImageSourcePropType;
  onComplete: (result: { pet: OnboardingPetDraft; medication: OnboardingMedicationDraft }) => void;
  /** When set, the "Continue with demo data" button is offered. */
  onSkip?: () => void;
  /** When true the flow starts at createPet instead of welcome. */
  initialStep?: "welcome" | "createPet";
  /** When set, a demo pet is shown on the welcome screen as inspiration. */
  demoPet?: Pet;
}

/**
 * Orchestrator for the four-step onboarding. Owns the local
 * navigation between steps and the per-step data. Calls back to
 * the host with the completed draft so it can be persisted (this
 * commit still uses AsyncStorage for the demo data; stage 7 will
 * route through the SQLite repository).
 */
export function OnboardingFlow({
  appIcon,
  onComplete,
  onSkip,
  initialStep = "welcome",
}: OnboardingFlowProps) {
  const [step, setStep] = useState<"welcome" | "createPet" | "createMedication" | "previewDose">(
    initialStep,
  );
  const [pet, setPet] = useState<OnboardingPetDraft | null>(null);
  const [medication, setMedication] = useState<OnboardingMedicationDraft | null>(
    null,
  );

  const handlePet = useCallback((draft: OnboardingPetDraft) => {
    setPet(draft);
    setStep("createMedication");
  }, []);

  const handleMedication = useCallback(
    (draft: OnboardingMedicationDraft) => {
      setMedication(draft);
      setStep("previewDose");
    },
    [],
  );

  if (step === "welcome") {
    return (
      <WelcomeScreen
        appIcon={appIcon}
        onSkip={onSkip ?? (() => undefined)}
        onStart={() => setStep("createPet")}
      />
    );
  }

  if (step === "createPet") {
    return (
      <AddPetScreen
        initial={pet ?? undefined}
        onBack={() => setStep("welcome")}
        onNext={handlePet}
      />
    );
  }

  if (step === "createMedication" && pet) {
    return (
      <AddMedicationOnboardingScreen
        onBack={() => setStep("createPet")}
        onNext={handleMedication}
        pet={pet}
      />
    );
  }

  if (step === "previewDose" && pet && medication) {
    return (
      <PreviewDoseScreen
        medication={medication}
        onFinish={() => onComplete({ pet, medication })}
        pet={pet}
      />
    );
  }

  // Defensive fallback — should never render.
  return null;
}
