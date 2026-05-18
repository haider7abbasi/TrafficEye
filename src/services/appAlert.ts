import type { AlertButton } from '../types/alert';

type ShowAlertFn = (title: string, message?: string, buttons?: AlertButton[]) => void;

let showAlertImpl: ShowAlertFn | null = null;

export function bindAppAlert(handler: ShowAlertFn) {
  showAlertImpl = handler;
}

export function unbindAppAlert() {
  showAlertImpl = null;
}

/**
 * Branded Traffic Eye alert. Prefer this over `Alert.alert`.
 * `AlertProvider` also patches `Alert.alert` app-wide while the app is mounted.
 */
export function appAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (!showAlertImpl) {
    if (__DEV__) {
      console.warn('[appAlert] AlertProvider not mounted:', title, message);
    }
    return;
  }
  showAlertImpl(title, message, buttons);
}

export type { AlertButton, AlertButtonStyle } from '../types/alert';
