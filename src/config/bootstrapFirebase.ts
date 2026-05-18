import { connectAuthEmulator, getAuth } from '@react-native-firebase/auth';
import { connectFirestoreEmulator, getFirestore } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';
import {
  USE_FIREBASE_EMULATOR,
  FIRESTORE_EMULATOR_HOST,
  FIRESTORE_EMULATOR_PORT,
  AUTH_EMULATOR_HOST,
  AUTH_EMULATOR_PORT,
} from '@env';

/**
 * Call before any other Firebase usage. Enabled only when USE_FIREBASE_EMULATOR=true in .env
 * Android emulator: use 10.0.2.2 instead of localhost to reach the host machine.
 */
export function bootstrapFirebase() {
  if (!__DEV__) {
    return;
  }
  if (String(USE_FIREBASE_EMULATOR).toLowerCase() !== 'true') {
    return;
  }

  const fsHost = FIRESTORE_EMULATOR_HOST || '10.0.2.2';
  const fsPort = Number(FIRESTORE_EMULATOR_PORT || '8080');
  const authHost = AUTH_EMULATOR_HOST || '10.0.2.2';
  const authPort = Number(AUTH_EMULATOR_PORT || '9099');

  const app = getApp();
  try {
    connectFirestoreEmulator(getFirestore(app), fsHost, fsPort);
  } catch {
    /* already configured */
  }
  try {
    connectAuthEmulator(getAuth(app), `http://${authHost}:${authPort}`);
  } catch {
    /* already configured */
  }
}
