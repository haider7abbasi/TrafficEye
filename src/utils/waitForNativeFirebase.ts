import { InteractionManager } from 'react-native';
import { getApps } from '@react-native-firebase/app';

const STEP_MS = 50;
const TIMEOUT_MS = 15000;
/** First `getApps()` runs `initializeNativeApps()` once forever; if native returns [] that turn, the JS registry stays empty. Defer the first check until after the bridge + Firebase init. */
const FIRST_GET_APPS_DELAY_MS = 200;

/**
 * RN Firebase lazily syncs native google-services apps into JS on first registry access.
 * On cold start, calling getApps()/auth()/getApp() too early can lock an empty registry →
 * "No Firebase App '[DEFAULT]' has been created".
 */
export function waitForNativeFirebaseReady(): Promise<void> {
  const deadline = Date.now() + TIMEOUT_MS;
  return new Promise((resolve, reject) => {
    const tick = () => {
      try {
        if (getApps().length > 0) {
          resolve();
          return;
        }
      } catch {
        /* native module not ready yet */
      }
      if (Date.now() >= deadline) {
        reject(new Error('Firebase did not initialize from native config in time.'));
        return;
      }
      setTimeout(tick, STEP_MS);
    };

    InteractionManager.runAfterInteractions(() => {
      setTimeout(tick, FIRST_GET_APPS_DELAY_MS);
    });
  });
}
