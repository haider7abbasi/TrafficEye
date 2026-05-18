import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';
import { TrafficEyeAlertModal } from '../components/TrafficEyeAlertModal';
import { bindAppAlert, unbindAppAlert } from '../services/appAlert';
import type { AlertButton, AlertPayload } from '../types/alert';

function normalizeButtons(buttons?: AlertButton[]): AlertButton[] {
  if (!buttons?.length) {
    return [{ text: 'OK', style: 'default' }];
  }
  return buttons;
}

type AlertContextValue = {
  showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
};

const AlertContext = createContext<AlertContextValue | null>(null);

export function AlertProvider({ children }: { children: ReactNode }) {
  const queueRef = useRef<AlertPayload[]>([]);
  const visibleRef = useRef(false);
  const showAlertRef = useRef<(title: string, message?: string, buttons?: AlertButton[]) => void>(
    () => {},
  );
  const [current, setCurrent] = useState<AlertPayload | null>(null);

  const showNext = useCallback(() => {
    const next = queueRef.current.shift();
    setCurrent(next ?? null);
  }, []);

  const showAlert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    const payload: AlertPayload = {
      title,
      message,
      buttons: normalizeButtons(buttons),
    };
    if (visibleRef.current) {
      queueRef.current.push(payload);
      return;
    }
    setCurrent(payload);
  }, []);

  showAlertRef.current = showAlert;

  useEffect(() => {
    visibleRef.current = current != null;
  }, [current]);

  const dismiss = useCallback(() => {
    setCurrent(null);
    setTimeout(() => {
      if (queueRef.current.length > 0) {
        showNext();
      }
    }, 220);
  }, [showNext]);

  const handleButtonPress = useCallback(
    (button: AlertButton) => {
      const onPress = button.onPress;
      dismiss();
      onPress?.();
    },
    [dismiss],
  );

  useEffect(() => {
    const nativeAlert = Alert.alert.bind(Alert);

    Alert.alert = (title, message?, buttons?) => {
      showAlertRef.current(
        String(title ?? ''),
        typeof message === 'string' ? message : undefined,
        buttons as AlertButton[] | undefined,
      );
    };

    bindAppAlert((title, message, buttons) => showAlertRef.current(title, message, buttons));

    return () => {
      Alert.alert = nativeAlert;
      unbindAppAlert();
    };
  }, []);

  const value = useMemo(() => ({ showAlert }), [showAlert]);

  return (
    <AlertContext.Provider value={value}>
      {children}
      <TrafficEyeAlertModal
        visible={current != null}
        title={current?.title ?? ''}
        message={current?.message}
        buttons={current?.buttons ?? [{ text: 'OK' }]}
        onDismiss={dismiss}
        onButtonPress={handleButtonPress}
      />
    </AlertContext.Provider>
  );
}

export function useAppAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error('useAppAlert must be used within AlertProvider');
  }
  return ctx;
}
