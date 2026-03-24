import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const noop = async () => null;

const GlobalActionContext = createContext({
  action: null,
  isRunning: false,
  registerAction: () => () => {},
  runAction: noop
});

export function GlobalActionProvider({ children }) {
  const [action, setAction] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const actionRef = useRef(null);

  const registerAction = useCallback((nextAction) => {
    actionRef.current = nextAction;
    setAction(nextAction);

    return () => {
      if (actionRef.current?.id === nextAction?.id) {
        actionRef.current = null;
        setAction(null);
      }
    };
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
    runAction
  }), [action, isRunning, registerAction, runAction]);

  return (
    <GlobalActionContext.Provider value={value}>
      {children}
    </GlobalActionContext.Provider>
  );
}

export function useGlobalAction() {
  return useContext(GlobalActionContext);
}
