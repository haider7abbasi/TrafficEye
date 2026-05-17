declare module '*.png' {
  const value: number;
  export default value;
}

declare module '@env' {
  /** Set to "true" only for local Firebase Emulator Suite */
  export const USE_FIREBASE_EMULATOR: string;
  export const FIRESTORE_EMULATOR_HOST: string;
  export const FIRESTORE_EMULATOR_PORT: string;
  export const AUTH_EMULATOR_HOST: string;
  export const AUTH_EMULATOR_PORT: string;

  /** Top-level collection for user profile documents (document id = Firebase Auth uid) */
  export const FIRESTORE_USERS_COLLECTION: string;
  /** Subcollection under each user doc where violation records are stored */
  export const FIRESTORE_VIOLATIONS_SUBCOLLECTION: string;

  /** Roboflow private API key (local `.env` only; never commit) */
  export const ROBOFLOW_API_KEY: string;
  export const ROBOFLOW_PROJECT_SEATBELT: string;
  export const ROBOFLOW_PROJECT_NUMBER_PLATE: string;
  export const ROBOFLOW_PROJECT_MOBILE_PHONE: string;
  export const ROBOFLOW_PROJECT_BIKE_HELMET: string;
  export const ROBOFLOW_PROJECT_VEHICLE: string;
  /** Hosted URL version segment per project (numeric string; defaults to "1" in code if unset) */
  export const ROBOFLOW_VERSION_SEATBELT: string;
  export const ROBOFLOW_VERSION_NUMBER_PLATE: string;
  export const ROBOFLOW_VERSION_MOBILE_PHONE: string;
  export const ROBOFLOW_VERSION_BIKE_HELMET: string;
  export const ROBOFLOW_VERSION_VEHICLE: string;
}
