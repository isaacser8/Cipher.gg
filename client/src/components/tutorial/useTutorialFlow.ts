import { useEffect, useState } from 'react';
import { useTutorial } from './useTutorial';
import type { TutorialStep } from './tutorialSteps';

type TutorialKey = 'home' | 'lobby' | 'game';

interface UseTutorialFlowOptions {
  key: TutorialKey;
  steps: TutorialStep[];
  shouldAutoStart?: boolean;
}

export function useTutorialFlow({
  key,
  steps,
  shouldAutoStart = false,
}: UseTutorialFlowOptions) {
  const { hasCompletedTutorial, completeTutorial } = useTutorial(key);
  const [runTutorial, setRunTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const currentStep = steps[tutorialStep];

  useEffect(() => {
    if (shouldAutoStart && !hasCompletedTutorial) {
      setTutorialStep(0);
      setRunTutorial(true);
    }
  }, [shouldAutoStart, hasCompletedTutorial]);

  const startTutorial = () => {
    setTutorialStep(0);
    setRunTutorial(true);
  };

  const handleNextTutorialStep = () => {
    if (tutorialStep >= steps.length - 1) {
      setRunTutorial(false);
      setTutorialStep(0);
      completeTutorial();
      return;
    }

    setTutorialStep((currentStepIndex) => currentStepIndex + 1);
  };

  const handlePreviousTutorialStep = () => {
    setTutorialStep((currentStepIndex) => Math.max(currentStepIndex - 1, 0));
  };

  return {
    hasCompletedTutorial,
    runTutorial,
    tutorialStep,
    currentStep,
    totalSteps: steps.length,
    startTutorial,
    handleNextTutorialStep,
    handlePreviousTutorialStep,
  };
}