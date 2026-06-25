import { useEffect, useState } from "react";

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  currentStep: string;
  completedSteps: string[];
}

interface UseOnboardingResult {
  state: OnboardingState;
  completeStep: (stepId: string) => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
  isNewUser: boolean;
}

const STORAGE_KEY = "adestro_onboarding_state";

export function useOnboarding(): UseOnboardingResult {
  const [state, setState] = useState<OnboardingState>(() => {
    if (typeof window === "undefined") {
      return {
        hasCompletedOnboarding: false,
        currentStep: "welcome",
        completedSteps: [],
      };
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {
          hasCompletedOnboarding: false,
          currentStep: "welcome",
          completedSteps: [],
        };
      }
    }

    return {
      hasCompletedOnboarding: false,
      currentStep: "welcome",
      completedSteps: [],
    };
  });

  // Sincronizar com localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const completeStep = (stepId: string) => {
    setState((prev) => {
      const completedSteps = [...prev.completedSteps, stepId];
      const hasCompletedOnboarding = completedSteps.length >= 6; // Ajustar conforme número de passos

      return {
        ...prev,
        completedSteps,
        hasCompletedOnboarding,
      };
    });
  };

  const skipOnboarding = () => {
    setState((prev) => ({
      ...prev,
      hasCompletedOnboarding: true,
    }));
  };

  const resetOnboarding = () => {
    setState({
      hasCompletedOnboarding: false,
      currentStep: "welcome",
      completedSteps: [],
    });
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    state,
    completeStep,
    skipOnboarding,
    resetOnboarding,
    isNewUser: !state.hasCompletedOnboarding,
  };
}
