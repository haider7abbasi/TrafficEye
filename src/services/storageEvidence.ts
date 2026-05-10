import storage from '@react-native-firebase/storage';
import {
  candidateEvidenceObjectPath,
  candidatePlateCropObjectPath,
  challanBundleObjectPath,
  sessionFrameObjectPath,
} from '../config/storagePaths';

export type UploadedStorageObject = {
  objectPath: string;
  downloadUrl: string;
};

function normalizeLocalUploadPath(localUri: string): string {
  const raw = localUri.trim();
  if (!raw) {
    throw new Error('Local file uri is required for Storage upload.');
  }
  if (/^https?:\/\//i.test(raw)) {
    throw new Error('Storage upload expects a local file uri/path, not a remote URL.');
  }
  // Keep `content://` URIs intact for Android Storage / Firebase; strip `file://` only.
  return raw.startsWith('file://') ? raw.replace('file://', '') : raw;
}

/** Storage object basename under the candidate folder; rules only require image/*. */
function candidateEvidenceFileName(localUri: string, contentTypeHint?: string): string {
  const sub = contentTypeHint?.split('/')[1]?.toLowerCase();
  if (sub === 'png') {
    return 'evidence.png';
  }
  if (sub === 'webp') {
    return 'evidence.webp';
  }
  if (sub === 'jpeg' || sub === 'jpg') {
    return 'evidence.jpg';
  }
  const u = localUri.toLowerCase();
  if (u.endsWith('.png')) {
    return 'evidence.png';
  }
  if (u.endsWith('.webp')) {
    return 'evidence.webp';
  }
  return 'evidence.jpg';
}

function evidenceUploadContentType(contentTypeHint?: string): string {
  if (contentTypeHint && /^image\//i.test(contentTypeHint)) {
    return contentTypeHint;
  }
  return 'image/jpeg';
}

async function uploadLocalFile(
  objectPath: string,
  localUri: string,
  contentType?: string,
): Promise<UploadedStorageObject> {
  const ref = storage().ref(objectPath);
  const localPath = normalizeLocalUploadPath(localUri);
  if (contentType) {
    await ref.putFile(localPath, { contentType });
  } else {
    await ref.putFile(localPath);
  }
  const downloadUrl = await ref.getDownloadURL();
  return { objectPath, downloadUrl };
}

export function getStorageDownloadUrl(objectPath: string): Promise<string> {
  return storage().ref(objectPath).getDownloadURL();
}

export function deleteStorageObject(objectPath: string): Promise<void> {
  return storage().ref(objectPath).delete();
}

export function uploadCandidateEvidenceImage(
  officerId: string,
  candidateId: string,
  localUri: string,
  contentTypeHint?: string,
): Promise<UploadedStorageObject> {
  const fileName = candidateEvidenceFileName(localUri, contentTypeHint);
  const objectPath = candidateEvidenceObjectPath(officerId, candidateId, fileName);
  return uploadLocalFile(objectPath, localUri, evidenceUploadContentType(contentTypeHint));
}

export function uploadCandidatePlateCropImage(
  officerId: string,
  candidateId: string,
  localUri: string,
): Promise<UploadedStorageObject> {
  const objectPath = candidatePlateCropObjectPath(officerId, candidateId, 'plate.jpg');
  return uploadLocalFile(objectPath, localUri, 'image/jpeg');
}

export function uploadChallanPdfFile(
  officerId: string,
  challanId: string,
  localUri: string,
): Promise<UploadedStorageObject> {
  const objectPath = challanBundleObjectPath(officerId, challanId, 'challan.pdf');
  return uploadLocalFile(objectPath, localUri, 'application/pdf');
}

export async function uploadChallanPdfBase64(
  officerId: string,
  challanId: string,
  pdfBase64: string,
): Promise<UploadedStorageObject> {
  const objectPath = challanBundleObjectPath(officerId, challanId, 'challan.pdf');
  const ref = storage().ref(objectPath);
  await ref.putString(pdfBase64, 'base64', {
    contentType: 'application/pdf',
  });
  const downloadUrl = await ref.getDownloadURL();
  return { objectPath, downloadUrl };
}

export function uploadSessionFrameImage(
  officerId: string,
  sessionId: string,
  frameId: string,
  localUri: string,
): Promise<UploadedStorageObject> {
  const objectPath = sessionFrameObjectPath(officerId, sessionId, frameId);
  return uploadLocalFile(objectPath, localUri, 'image/jpeg');
}

/**
 * Copies an existing Storage object into the challan bundle path.
 * Uses download URL + blob re-upload for client-side copy.
 */
export async function cloneStorageObjectToChallan(
  sourceObjectPath: string,
  officerId: string,
  challanId: string,
  targetFileName: string,
  contentType: string,
): Promise<UploadedStorageObject> {
  const sourceUrl = await getStorageDownloadUrl(sourceObjectPath);
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download source storage object: ${response.status}`);
  }
  const blob = await response.blob();
  const targetPath = challanBundleObjectPath(officerId, challanId, targetFileName);
  const ref = storage().ref(targetPath);
  await ref.put(blob as unknown as Blob, { contentType });
  const downloadUrl = await ref.getDownloadURL();
  return { objectPath: targetPath, downloadUrl };
}
