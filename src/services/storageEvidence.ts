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

export function isRemoteUri(uri: string): boolean {
  return /^https?:\/\//i.test(uri.trim());
}

export function isLocalDeviceUri(uri: string): boolean {
  const u = uri.trim();
  return u.length > 0 && !isRemoteUri(u);
}

/** Path/URI passed to Firebase `putFile` (must be file:// or content:// on Android). */
function pathForPutFile(localUri: string): string {
  const raw = localUri.trim();
  if (!raw) {
    throw new Error('Local file uri is required for Storage upload.');
  }
  if (isRemoteUri(raw)) {
    throw new Error('Storage upload expects a local file uri/path, not a remote URL.');
  }
  if (raw.startsWith('file://') || raw.startsWith('content://')) {
    return raw;
  }
  return `file://${raw}`;
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

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const g = globalThis as {
    Buffer?: { from: (data: Uint8Array) => { toString: (encoding: string) => string } };
    btoa?: (data: string) => string;
  };
  if (g.Buffer) {
    return g.Buffer.from(bytes).toString('base64');
  }
  if (typeof g.btoa === 'function') {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const slice = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...slice);
    }
    return g.btoa(binary);
  }
  throw new Error('No base64 encoder available in this runtime.');
}

async function uploadLocalFile(
  objectPath: string,
  localUri: string,
  contentType?: string,
): Promise<UploadedStorageObject> {
  const ref = storage().ref(objectPath);
  const localPath = pathForPutFile(localUri);
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

export function uploadChallanEvidenceFromLocal(
  officerId: string,
  challanId: string,
  localUri: string,
  contentTypeHint?: string,
): Promise<UploadedStorageObject> {
  const fileName = candidateEvidenceFileName(localUri, contentTypeHint);
  const objectPath = challanBundleObjectPath(officerId, challanId, fileName);
  return uploadLocalFile(objectPath, localUri, evidenceUploadContentType(contentTypeHint));
}

export async function uploadChallanPdfBase64(
  officerId: string,
  challanId: string,
  pdfBase64: string,
): Promise<UploadedStorageObject> {
  const encoded = pdfBase64?.trim();
  if (!encoded) {
    throw new Error('Challan PDF payload is empty.');
  }
  const objectPath = challanBundleObjectPath(officerId, challanId, 'challan.pdf');
  const ref = storage().ref(objectPath);
  await ref.putString(encoded, 'base64', {
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
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.byteLength === 0) {
    throw new Error('Source storage object is empty.');
  }
  const targetPath = challanBundleObjectPath(officerId, challanId, targetFileName);
  const ref = storage().ref(targetPath);
  await ref.putString(uint8ArrayToBase64(bytes), 'base64', { contentType });
  const downloadUrl = await ref.getDownloadURL();
  return { objectPath: targetPath, downloadUrl };
}
