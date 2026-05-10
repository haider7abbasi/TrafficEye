'use strict';

/**
 * Creates a Firebase Auth user + Firestore profile for local/dev login.
 * Password is stored ONLY in Firebase Authentication (never in Firestore).
 *
 * Prerequisites:
 * 1. Firebase Console → Project settings → Service accounts → Generate new private key.
 * 2. Set env (PowerShell): $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccountKey.json"
 *    Or: GOOGLE_APPLICATION_CREDENTIALS=... npm run seed:user
 * 3. Enable Authentication → Email/Password in the same Firebase project.
 */

const admin = require('firebase-admin');

const EMAIL = process.env.SEED_EMAIL || 'haider@traffic.com';
const PASSWORD = process.env.SEED_PASSWORD || 'police';
const USERS_COLLECTION = (process.env.FIRESTORE_USERS_COLLECTION || 'users').trim();

function initAdmin() {
  if (admin.apps.length) {
    return;
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      'Missing GOOGLE_APPLICATION_CREDENTIALS.\n' +
        'Download a service account JSON from Firebase Console → Project settings → Service accounts,\n' +
        'then set GOOGLE_APPLICATION_CREDENTIALS to the full path of that file.',
    );
    process.exit(1);
  }
  admin.initializeApp();
}

async function main() {
  initAdmin();
  const auth = admin.auth();
  const db = admin.firestore();

  let uid;
  try {
    const existing = await auth.getUserByEmail(EMAIL);
    uid = existing.uid;
    await auth.updateUser(uid, { password: PASSWORD, emailVerified: false });
    console.log('Updated existing Auth user:', EMAIL, 'uid:', uid);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      const created = await auth.createUser({
        email: EMAIL,
        password: PASSWORD,
        displayName: 'Haider',
      });
      uid = created.uid;
      console.log('Created Auth user:', EMAIL, 'uid:', uid);
    } else {
      throw e;
    }
  }

  // approved: true so this dev officer can use Storage + candidates rules without Console approval.
  const profile = {
    name: 'Haider',
    email: EMAIL,
    role: 'officer',
    approved: true,
    phone: '',
    department: 'Traffic Enforcement',
    location: '',
    badgeNumber: 'TE-STATIC',
  };

  await db.collection(USERS_COLLECTION).doc(uid).set(profile, { merge: true });
  console.log(
    `Firestore document ready: ${USERS_COLLECTION}/${uid}`,
    '(password is only in Auth, not in this document)',
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
