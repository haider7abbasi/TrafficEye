import { doc, getDoc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '../config/firebase';
import { USERS_COLLECTION } from '../config/collections';
import type { SettingsState } from '../store/slices/settingsSlice';
import {
  parseUserAppSettings,
  settingsStateToFirestore,
} from './userSettingsSchema';

export { parseUserAppSettings, settingsStateToFirestore } from './userSettingsSchema';
export type { UserAppSettingsFirestore } from './userSettingsSchema';

export async function loadUserSettingsFromFirestore(
  uid: string,
): Promise<Partial<SettingsState> | null> {
  const snap = await getDoc(doc(getFirebaseDb(), USERS_COLLECTION, uid));
  if (!snap.exists()) {
    return null;
  }
  const data = snap.data();
  return parseUserAppSettings(data?.appSettings);
}

export async function saveUserSettingsToFirestore(
  uid: string,
  settings: SettingsState,
): Promise<void> {
  await setDoc(
    doc(getFirebaseDb(), USERS_COLLECTION, uid),
    {
      appSettings: {
        ...settingsStateToFirestore(settings),
        updatedAt: serverTimestamp(),
      },
    },
    { merge: true },
  );
}

export async function saveCurrentUserSettingsToFirestore(settings: SettingsState): Promise<void> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    throw new Error('Sign in to save settings.');
  }
  await saveUserSettingsToFirestore(uid, settings);
}
