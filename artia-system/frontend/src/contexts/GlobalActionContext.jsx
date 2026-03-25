import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const noop = async () => null;

function toPublicAction(action) {
  if (!action?.id || !action?.label) {
    return null;
  }

  return {
    id: action.id,
    label: action.label
  };
}

const GlobalActionContext = createContext({
  action: null,
  isRunning: false,
  registerAction: () => {},
  unregisterAction: () => {},
  runAction: noop
});

export function GlobalActionProvider({ children }) {
  const [action, setAction] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const actionRef = useRef(null);

  const registerAction = useCallback((nextAction) => {
    if (!nextAction?.id || !nextAction?.label || typeof nextAction.run !== 'function') {
      return;
    }

    actionRef.current = nextAction;
    const nextPublicAction = toPublicAction(nextAction);

    setAction((currentAction) => {
      if (
        currentAction?.id === nextPublicAction.id &&
        currentAction?.label === nextPublicAction.label
      ) {
        return currentAction;
      }

      return nextPublicAction;
    });
  }, []);

  const unregisterAction = useCallback((actionId) => {
    if (!actionId) {
      return;
    }

    if (actionRef.current?.id === actionId) {
      actionRef.current = null;
    }

    setAction((currentAction) => (
      currentAction?.id === actionId ? null : currentAction
    ));
  }, []);

  const runAction = useCallback(async () => {
    if (!actionRef.current?.run || isRunning) {
      return null;
    }

    setIsRunning(true);

    try {
      return await actionRef.current.run();
    } finally {
      setIsRunning(false);
    }
  }, [isRunning]);

  const value = useMemo(() => ({
    action,
    isRunning,
    registerAction,
    unregisterAction,
    runAction
  }), [action, isRunning, registerAction, unregisterAction, runAction]);

  return (
    <GlobalActionContext.Provider value={value}>
      {children}
    </GlobalActionContext.Provider>
  );
}

export function useGlobalAction() {
  return useContext(GlobalActionContext);
}
