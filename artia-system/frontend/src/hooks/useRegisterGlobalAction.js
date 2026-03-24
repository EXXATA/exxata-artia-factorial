import { useEffect } from 'react';
import { useGlobalAction } from '../contexts/GlobalActionContext';

export function useRegisterGlobalAction(action, enabled = true) {
  const { registerAction } = useGlobalAction();

  useEffect(() => {
    if (!enabled || !action?.run) {
      return undefined;
    }

    return registerAction(action);
  }, [action, enabled, registerAction]);
}
