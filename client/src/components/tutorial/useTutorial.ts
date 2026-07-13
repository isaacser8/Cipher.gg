import { useCallback, useState } from 'react';

type TutorialKey = 'home' | 'lobby' | 'game';

const getStorageKey = (key: TutorialKey) => `cipherTutorial_${key}_completed`;

export function useTutorial(key: TutorialKey) {
  const storageKey = getStorageKey(key);

  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(() => {
    return localStorage.getItem(storageKey) === 'true';
  });

  const completeTutorial = useCallback(() => {
    localStorage.setItem(storageKey, 'true');
    setHasCompletedTutorial(true);
  }, [storageKey]);

  const resetTutorial = useCallback(() => {
    localStorage.removeItem(storageKey);
    setHasCompletedTutorial(false);
  }, [storageKey]);

  return {
    hasCompletedTutorial,
    completeTutorial,
    resetTutorial,
  };
}