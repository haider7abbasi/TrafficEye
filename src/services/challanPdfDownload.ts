import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import type { ChallanRecord } from '../types/challanRecord';
import { buildChallanPdfBase64, type ChallanPdfPayload } from './challanPdf';
import { getStorageDownloadUrl } from './storageEvidence';
import type { SpecViolationId } from '../rules/specViolationMapping';

const LOG_PREFIX = '[ChallanPDF]';

function debugLog(step: string, detail?: Record<string, unknown>): void {
  if (__DEV__) {
    if (detail) {
      console.log(LOG_PREFIX, step, detail);
    } else {
      console.log(LOG_PREFIX, step);
    }
  }
}

function debugWarn(step: string, detail?: Record<string, unknown>): void {
  if (__DEV__) {
    if (detail) {
      console.warn(LOG_PREFIX, step, detail);
    } else {
      console.warn(LOG_PREFIX, step);
    }
  }
}

function isSpecViolationId(value: string): value is SpecViolationId {
  return value === 'no_seatbelt' || value === 'no_helmet' || value === 'mobile_phone_use';
}

function challanToPdfPayload(challan: ChallanRecord): ChallanPdfPayload {
  const violationTypes = challan.violationTypeIds.filter(isSpecViolationId);
  return {
    challanId: challan.id,
    confirmedAtIso: challan.confirmedAt,
    expiresAtIso: challan.expiresAt,
    officerName: challan.officerName,
    officerBadge: challan.officerBadge,
    officerDepartment: challan.officerDepartment,
    plateDisplay: challan.plateDisplay || challan.plateCanonical,
    plateCanonical: challan.plateCanonical || challan.plateDisplay,
    locationText: challan.locationText,
    violationTypes,
    status: challan.status,
    candidateId: challan.createdFromCandidateId,
    evidenceImageRef: challan.evidenceImageRef,
    plateCropRef: challan.plateCropRef,
  };
}

async function fetchPdfBase64FromStorage(objectPath: string): Promise<string> {
  debugLog('fetchFromStorage:start', { objectPath });
  const url = await getStorageDownloadUrl(objectPath);
  debugLog('fetchFromStorage:urlResolved', { urlPreview: url.slice(0, 80) + '…' });
  const response = await fetch(url);
  debugLog('fetchFromStorage:response', { status: response.status, ok: response.ok });
  if (!response.ok) {
    throw new Error(`Could not download PDF (${response.status}).`);
  }
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  debugLog('fetchFromStorage:bytes', { byteLength: bytes.byteLength });
  if (bytes.byteLength === 0) {
    throw new Error('PDF file is empty.');
  }
  const g = globalThis as {
    Buffer?: { from: (data: Uint8Array) => { toString: (encoding: string) => string } };
  };
  if (g.Buffer) {
    const base64 = g.Buffer.from(bytes).toString('base64');
    debugLog('fetchFromStorage:encoded', { base64Length: base64.length });
    return base64;
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const btoaFn = (globalThis as { btoa?: (data: string) => string }).btoa;
  if (typeof btoaFn === 'function') {
    const base64 = btoaFn(binary);
    debugLog('fetchFromStorage:encoded', { base64Length: base64.length });
    return base64;
  }
  throw new Error('No base64 encoder available.');
}

async function resolvePdfBase64(challan: ChallanRecord): Promise<{ base64: string; source: 'storage' | 'generated' }> {
  if (challan.challanPdfRef) {
    debugLog('resolvePdf:start', { challanId: challan.id, challanPdfRef: challan.challanPdfRef });
    try {
      const base64 = await fetchPdfBase64FromStorage(challan.challanPdfRef);
      debugLog('resolvePdf:done', { source: 'storage', base64Length: base64.length });
      return { base64, source: 'storage' };
    } catch (e) {
      const message = (e as { message?: string })?.message ?? String(e);
      debugWarn('resolvePdf:storageFailed', { message, fallback: 'generated' });
      const base64 = buildChallanPdfBase64(challanToPdfPayload(challan));
      debugLog('resolvePdf:done', { source: 'generated', base64Length: base64.length });
      return { base64, source: 'generated' };
    }
  }
  debugLog('resolvePdf:start', { challanId: challan.id, challanPdfRef: null, source: 'generated' });
  const base64 = buildChallanPdfBase64(challanToPdfPayload(challan));
  debugLog('resolvePdf:done', { source: 'generated', base64Length: base64.length });
  return { base64, source: 'generated' };
}

function fileUriForShare(path: string): string {
  if (Platform.OS === 'ios') {
    return path;
  }
  return path.startsWith('file://') ? path : `file://${path}`;
}

async function openPdfOnAndroid(path: string, challanId: string): Promise<void> {
  debugLog('download:androidActionView', { path });
  try {
    await ReactNativeBlobUtil.android.actionViewIntent(path, 'application/pdf', `Challan ${challanId}`);
    debugLog('download:androidActionView:ok');
  } catch (e) {
    const message = (e as { message?: string })?.message ?? String(e);
    debugWarn('download:androidActionView:failed', { message });
    throw e;
  }
}

async function sharePdfFile(path: string, fileName: string, challanId: string): Promise<void> {
  const shareUrl = fileUriForShare(path);
  debugLog('download:shareOpen', { shareUrl, fileName, platform: Platform.OS });

  if (Platform.OS === 'android') {
    try {
      const shareResult = await Share.open({
        url: shareUrl,
        type: 'application/pdf',
        title: `Challan ${challanId}`,
        subject: `TrafficEye challan ${challanId}`,
        failOnCancel: false,
      });
      debugLog('download:shareOpen:ok', { shareResult: shareResult ?? 'void' });
      return;
    } catch (e) {
      const message = (e as { message?: string })?.message ?? String(e);
      if (String(message).toLowerCase().includes('user did not share')) {
        throw e;
      }
      debugWarn('download:shareOpen:fallbackActionView', { message });
      await openPdfOnAndroid(path, challanId);
      return;
    }
  }

  const shareResult = await Share.open({
    url: shareUrl,
    type: 'application/pdf',
    filename: fileName,
    title: `Challan ${challanId}`,
    subject: `TrafficEye challan ${challanId}`,
    failOnCancel: false,
  });
  debugLog('download:shareOpen:ok', { shareResult: shareResult ?? 'void' });
}

/**
 * Saves challan PDF to cache and opens the system share sheet (save / open / send).
 */
export async function downloadChallanPdf(challan: ChallanRecord): Promise<void> {
  debugLog('download:start', {
    challanId: challan.id,
    platform: Platform.OS,
    plate: challan.plateDisplay,
    challanPdfRef: challan.challanPdfRef ?? null,
  });

  try {
    const { base64, source } = await resolvePdfBase64(challan);
    const fileName = `${challan.id}.pdf`;

    const shareDir =
      Platform.OS === 'android'
        ? ReactNativeBlobUtil.fs.dirs.CacheDir
        : ReactNativeBlobUtil.fs.dirs.DocumentDir;
    const sharePath = `${shareDir}/${fileName}`;

    debugLog('download:writeFile', {
      sharePath,
      shareDir,
      fileName,
      source,
      base64Length: base64.length,
    });
    await ReactNativeBlobUtil.fs.writeFile(sharePath, base64, 'base64');
    debugLog('download:writeFile:ok', { sharePath });

    if (Platform.OS === 'android') {
      const downloadPath = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${fileName}`;
      debugLog('download:androidCopyToDownloads', { downloadPath });
      await ReactNativeBlobUtil.fs.writeFile(downloadPath, base64, 'base64');
      debugLog('download:androidAddCompleteDownload', { downloadPath });
      await ReactNativeBlobUtil.android.addCompleteDownload({
        title: `TrafficEye Challan ${challan.id}`,
        description: 'Challan PDF',
        mime: 'application/pdf',
        path: downloadPath,
        showNotification: true,
      });
      debugLog('download:androidAddCompleteDownload:ok');
    }

    await sharePdfFile(sharePath, fileName, challan.id);
    debugLog('download:complete', { challanId: challan.id });
  } catch (e) {
    const message = (e as { message?: string })?.message ?? String(e);
    debugWarn('download:failed', { challanId: challan.id, message });
    throw e;
  }
}
