import {
  FIRESTORE_USERS_COLLECTION,
  FIRESTORE_VIOLATIONS_SUBCOLLECTION,
} from '@env';

export const USERS_COLLECTION = FIRESTORE_USERS_COLLECTION?.trim() || 'users';
export const VIOLATIONS_SUBCOLLECTION =
  FIRESTORE_VIOLATIONS_SUBCOLLECTION?.trim() || 'violations';

/** Top-level collection ids — must match `firestore.rules` and composite queries in `firestore.indexes.json`. */
export const TRAFFIC_RULES_COLLECTION = 'traffic_rules';
export const INTAKE_SESSIONS_COLLECTION = 'intake_sessions';
export const CANDIDATES_COLLECTION = 'candidates';
export const CHALLANS_COLLECTION = 'challans';
