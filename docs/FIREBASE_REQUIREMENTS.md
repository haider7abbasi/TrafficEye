# Firebase Requirements for TrafficEye

This file documents all Firebase requirements currently needed by this project.

## 1) Required NPM Packages

Install project dependencies (already present in `package.json`):

- `@react-native-firebase/app`
- `@react-native-firebase/auth`
- `@react-native-firebase/firestore`

Optional tooling package used by scripts:

- `firebase-admin` (used by `scripts/seed-static-user.cjs`, not by the mobile runtime app)

## 2) Required Native Firebase Config Files

### Android (required)

- `android/app/google-services.json` must exist and match your Firebase Android app.
- Android package name must match Firebase Console app registration:
  - `com.trafficeye` (from `android/app/build.gradle`)

### iOS (required if building iOS)

- `ios/GoogleService-Info.plist` must be added to the Xcode project.

## 3) Required Android Gradle Setup

These are required for Firebase plugin + native initialization:

- `android/app/build.gradle` includes:
  - `apply plugin: "com.google.gms.google-services"`
  - buildscript dependency: `classpath("com.google.gms:google-services:4.4.4")`
  - Firebase BOM: `implementation platform("com.google.firebase:firebase-bom:34.10.0")`
  - `implementation "com.google.firebase:firebase-common"`

## 4) Required Firebase Console Setup

In Firebase Console for this project:

- Create/register Android app with package: `com.trafficeye`
- Enable **Authentication -> Email/Password**
- Create **Firestore Database**
- Add SHA fingerprints for Android app:
  - Debug SHA-1 and SHA-256
  - Release SHA-1 and SHA-256 (for release builds)
- Re-download `google-services.json` after adding fingerprints or changing app settings

## 5) Required Environment Values

The app reads Firebase-related JS config via `.env` (`.env.example` is provided).

Required for current Firestore structure:

- `FIRESTORE_USERS_COLLECTION` (default: `users`)
- `FIRESTORE_VIOLATIONS_SUBCOLLECTION` (default: `violations`)

Optional (only when using local emulators in dev):

- `USE_FIREBASE_EMULATOR=true`
- `FIRESTORE_EMULATOR_HOST` (Android emulator usually `10.0.2.2`)
- `FIRESTORE_EMULATOR_PORT` (default `8080`)
- `AUTH_EMULATOR_HOST` (Android emulator usually `10.0.2.2`)
- `AUTH_EMULATOR_PORT` (default `9099`)

## 6) Required Firestore/Auth Behavior Supported by Code

This app requires:

- Firebase Auth sign-in/sign-out (`Email/Password`)
- Firestore read/write on:
  - `users/{uid}`
  - `users/{uid}/violations/{violationId}`

Recommended minimum Firestore rules shape (see `.env.example` comments):

- User can only read/write their own `users/{uid}` doc
- User can only read/write their own `users/{uid}/violations/*` docs

## 7) Runtime Initialization Requirements

The code expects Firebase native app initialization before auth/firestore usage:

- `waitForNativeFirebaseReady()` must succeed before first Firebase calls
- Android native `MainApplication.kt` initializes default app when needed:
  - `FirebaseApp.initializeApp(this)`

## 8) Verification Checklist

After setup:

1. Run Android build: `npm run android`
2. In dev logs, confirm:
   - `[Firebase] Default app connected: [DEFAULT] | projectId: ...`
3. Confirm Email/Password login works
4. Confirm user profile doc is created in Firestore on first login
5. Confirm violations list reads/writes under `users/{uid}/violations`

## 9) Helpful Commands

- Install dependencies: `npm install`
- Rebuild Android: `cd android && gradlew clean && cd .. && npm run android`
- Print debug SHA fingerprints (PowerShell):
  - `keytool -list -v -keystore android\app\debug.keystore -alias androiddebugkey -storepass android -keypass android`
