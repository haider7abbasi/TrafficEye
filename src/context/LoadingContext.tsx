import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { LoadingOverlay } from '../components/LoadingOverlay';

type LoadingContextValue = {
  visible: boolean;
  message: string;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  setLoadingMessage: (message: string) => void;
  runWithLoading: <T>(fn: () => Promise<T>, message?: string) => Promise<T>;
};

const DEFAULT_MESSAGE = 'Please wait…';

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const depthRef = useRef(0);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [visible, setVisible] = useState(false);

  const showLoading = useCallback((nextMessage?: string) => {
    depthRef.current += 1;
    if (nextMessage) {
      setMessage(nextMessage);
    }
    setVisible(true);
  }, []);

  const hideLoading = useCallback(() => {
    depthRef.current = Math.max(0, depthRef.current - 1);
    if (depthRef.current === 0) {
      setVisible(false);
      setMessage(DEFAULT_MESSAGE);
    }
  }, []);

  const setLoadingMessage = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
  }, []);

  const runWithLoading = useCallback(
    async <T,>(fn: () => Promise<T>, nextMessage?: string): Promise<T> => {
      showLoading(nextMessage);
      try {
        return await fn();
      } finally {
        hideLoading();
      }
    },
    [hideLoading, showLoading],
  );

  const value = useMemo(
    () => ({
      visible,
      message,
      showLoading,
      hideLoading,
      setLoadingMessage,
      runWithLoading,
    }),
    [hideLoading, message, runWithLoading, setLoadingMessage, showLoading, visible],
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <LoadingOverlay visible={visible} message={message} />
    </LoadingContext.Provider>
  );
}

export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return ctx;
}
