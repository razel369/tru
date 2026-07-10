import { useCallback, useState } from "react";

import type {
  OnboardingMedicationDraft,
  OnboardingPetDraft,
  OnboardingState,
  OnboardingStep,
} from "./types";
import { INITIAL_ONBOARDING } from "./types";

/**
 * Tiny hook-based state container for the onboarding flow. We
 * intentionally avoid pulling in zustand or redux here — the
 * onboarding is short, linear, and disappears once complete.
 */
export function useOnboardingStore() {
  const [state, setState] = useState<OnboardingState>(INITIAL_ONBOARDING);

  const goTo = useCallback((step: OnboardingStep) => {
    setState((s) => ({ ...s, step }));
  }, []);

  const setPet = useCallback((pet: OnboardingPetDraft) => {
    setState((s) => ({ ...s, pet }));
  }, []);

  const setMedication = useCallback(
    (medication: OnboardingMedicationDraft) => {
      setState((s) => ({ ...s, medication }));
    },
    [],
  );

  const reset = useCallback(() => {
    setState(INITIAL_ONBOARDING);
  }, []);

  return { state, goTo, setPet, setMedication, reset };
}
