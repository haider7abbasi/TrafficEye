'use strict';

/**
 * Deletes expired challans (Firestore + Storage objects).
 *
 * Usage:
 *   npm run cleanup:expired
 *   npm run cleanup:expired -- --dry-run
 *
 * Prerequisite: GOOGLE_APPLICATION_CREDENTIALS set to Firebase service-account JSON.
 */

const admin = require('firebase-admin');

const CHALLANS_COLLECTION = (process.env.CHALLANS_COLLECTION || 'challans').trim();
const BATCH_SIZE = Number(process.env.EXPIRED_BATCH_SIZE || '200');
const DRY_RUN = process.argv.includes('--dry-run');

function initAdmin() {
  if (admin.apps.length) {
    return;
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Missing GOOGLE_APPLICATION_CREDENTIALS for admin SDK.');
    process.exit(1);
  }
  admin.initializeApp();
}

function normalizeStoragePath(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }
  const path = input.trim();
  if (!path) {
    return null;
  }
  if (path.startsWith('gs://')) {
    const parts = path.replace('gs://', '').split('/');
    parts.shift();
    return parts.join('/');
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return null;
  }
  return path;
}

async function deleteStoragePath(bucket, refPath) {
  if (!refPath) {
    return false;
  }
  if (DRY_RUN) {
    return true;
  }
  try {
    await bucket.file(refPath).delete({ ignoreNotFound: true });
    return true;
  } catch (e) {
    console.warn('[cleanup] storage delete failed:', refPath, e.message);
    return false;
  }
}

async function main() {
  initAdmin();
  const db = admin.firestore();
  const bucket = admin.storage().bucket();
  const nowTs = admin.firestore.Timestamp.now();
  const query = db
    .collection(CHALLANS_COLLECTION)
    .where('expiresAt', '<=', nowTs)
    .orderBy('expiresAt', 'asc')
    .limit(BATCH_SIZE);

  const snap = await query.get();
  if (snap.empty) {
    console.log('[cleanup] no expired challans found');
    return;
  }

  let deletedDocs = 0;
  let deletedFiles = 0;
  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const refs = [
      normalizeStoragePath(data.evidenceImageRef),
      normalizeStoragePath(data.plateCropRef),
      normalizeStoragePath(data.challanPdfRef),
    ].filter(Boolean);

    for (const refPath of refs) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await deleteStoragePath(bucket, refPath);
      if (ok) {
        deletedFiles += 1;
      }
    }

    if (!DRY_RUN) {
      // eslint-disable-next-line no-await-in-loop
      await doc.ref.delete();
    }
    deletedDocs += 1;
  }

  console.log(
    `[cleanup] processed challans=${deletedDocs}, storageObjects=${deletedFiles}, dryRun=${DRY_RUN}`,
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
