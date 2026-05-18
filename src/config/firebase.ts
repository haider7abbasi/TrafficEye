import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

/** Modular Firebase Auth instance (replaces deprecated `auth()`). */
export function getFirebaseAuth() {
  return getAuth(getApp());
}

/** Modular Firestore instance (replaces deprecated `firestore()`). */
export function getFirebaseDb() {
  return getFirestore(getApp());
}
