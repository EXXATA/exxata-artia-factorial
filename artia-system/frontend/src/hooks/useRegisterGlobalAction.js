import { useEffect } from 'react';
import { useGlobalAction } from '../contexts/GlobalActionContext';

export function useRegisterGlobalAction(action, enabled = true) {
  const { registerAction, unregisterAction } = useGlobalAction();
  const actionId = action?.id || null;
  const actionLabel = action?.label || '';
  const canRegister = Boolean(enabled && actionId && actionLabel && typeof action?.run === 'function');

  useEffect(() => {
    if (!canRegister) {
      return undefined;
    }

    registerAction(action);
    return () => unregisterAction(actionId);
  }, [actionId, actionLabel, canRegister, registerAction, unregisterAction]);

  useEffect(() => {
    if (!canRegister) {
      return;
    }

    registerAction(action);
  }, [action, canRegister, registerAction]);
}
