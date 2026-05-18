import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from '@react-native-firebase/firestore';
import { getFirebaseDb } from '../config/firebase';
import { CANDIDATES_COLLECTION, CHALLANS_COLLECTION } from '../config/collections';
import type { User } from '../context/AppContext';
import type { SpecViolationId } from '../rules/specViolationMapping';
import { markChallanConfirmed } from './dedupGate';
import { buildChallanPdfBase64 } from './challanPdf';
import {
  cloneStorageObjectToChallan,
  isLocalDeviceUri,
  uploadChallanEvidenceFromLocal,
} from './storageEvidence';

export type ConfirmChallanInput = {
  candidateId: string;
  officerId: string;
  officer: Pick<User, 'name' | 'badgeNumber' | 'department'>;
  plateDisplay: string;
  plateCanonical: string;
  violationTypes: SpecViolationId[];
  locationText?: string;
  evidenceImageRef?: string;
  plateCropRef?: string;
  /** When set, uploads evidence directly from device storage (avoids cloud copy). */
  localEvidenceUri?: string;
  localEvidenceContentType?: string;
  rulesFreezeVersion?: number;
  uploadChallanPdfFromBase64: (challanId: string, pdfBase64: string) => Promise<{ objectPath: string }>;
};

export type ConfirmChallanResult = {
  challanId: string;
  evidenceImageRef?: string;
  plateCropRef?: string;
};

function asSpecViolationIds(raw: unknown): SpecViolationId[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const valid: SpecViolationId[] = [];
  for (const v of raw) {
    const s = String(v);
    if (s === 'no_seatbelt' || s === 'no_helmet' || s === 'mobile_phone_use') {
      valid.push(s);
    }
  }
  return [...new Set(valid)];
}

async function resolveChallanEvidenceRef(
  input: ConfirmChallanInput,
  challanId: string,
): Promise<string | undefined> {
  const localUri = input.localEvidenceUri?.trim();
  if (localUri && isLocalDeviceUri(localUri)) {
    try {
      const uploaded = await uploadChallanEvidenceFromLocal(
        input.officerId,
        challanId,
        localUri,
        input.localEvidenceContentType,
      );
      return uploaded.objectPath;
    } catch (e) {
      console.warn('[challan] Local evidence unavailable; falling back to cloud copy.', e);
    }
  }

  if (input.evidenceImageRef) {
    const copied = await cloneStorageObjectToChallan(
      input.evidenceImageRef,
      input.officerId,
      challanId,
      'evidence.jpg',
      'image/jpeg',
    );
    return copied.objectPath;
  }

  return undefined;
}

export async function confirmChallanForCandidate(input: ConfirmChallanInput): Promise<ConfirmChallanResult> {
  const db = getFirebaseDb();
  const challanId = `chal-${Date.now()}-${input.candidateId}`;
  let evidenceRef = input.evidenceImageRef;
  let plateCropRef = input.plateCropRef;

  evidenceRef = await resolveChallanEvidenceRef(input, challanId);
  if (!evidenceRef) {
    throw new Error(
      'Could not attach evidence to the challan. The photo may no longer be on this device — open a freshly saved violation and try again.',
    );
  }
  if (plateCropRef) {
    const copied = await cloneStorageObjectToChallan(
      plateCropRef,
      input.officerId,
      challanId,
      'plate.jpg',
      'image/jpeg',
    );
    plateCropRef = copied.objectPath;
  }

  const confirmedAt = new Date();
  const expiresAt = new Date(confirmedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const pdfBase64 = buildChallanPdfBase64({
    challanId,
    confirmedAtIso: confirmedAt.toISOString(),
    expiresAtIso: expiresAt.toISOString(),
    officerName: input.officer.name,
    officerBadge: input.officer.badgeNumber,
    officerDepartment: input.officer.department,
    plateDisplay: input.plateDisplay,
    plateCanonical: input.plateCanonical,
    locationText: input.locationText,
    violationTypes: input.violationTypes,
    status: 'confirmed',
    candidateId: input.candidateId,
    evidenceImageRef: evidenceRef,
    plateCropRef: plateCropRef ?? undefined,
  });
  if (!pdfBase64?.trim()) {
    throw new Error('Failed to generate challan PDF.');
  }
  const uploadedPdf = await input.uploadChallanPdfFromBase64(challanId, pdfBase64);

  const candidateRef = doc(collection(db, CANDIDATES_COLLECTION), input.candidateId);
  const challanRef = doc(collection(db, CHALLANS_COLLECTION), challanId);

  await runTransaction(db, async tx => {
    const snap = await tx.get(candidateRef);
    if (!snap.exists()) {
      throw new Error('Candidate no longer exists.');
    }
    const data = snap.data() as Record<string, unknown>;
    const violationTypes = asSpecViolationIds(data.violationTypes);
    const types = violationTypes.length > 0 ? violationTypes : input.violationTypes;

    tx.set(
      challanRef,
      {
        challanId,
        officerId: input.officerId,
        confirmationOfficerId: input.officerId,
        createdFromCandidateId: input.candidateId,
        rulesFreezeVersion:
          typeof data.rulesFreezeVersion === 'number'
            ? data.rulesFreezeVersion
            : (input.rulesFreezeVersion ?? 1),
        confirmedAt: Timestamp.fromDate(confirmedAt),
        expiresAt: Timestamp.fromDate(expiresAt),
        violationTypes: types,
        vehiclePlateDisplay: input.plateDisplay,
        vehiclePlateCanonical: input.plateCanonical,
        evidenceImageRef: evidenceRef ?? null,
        plateCropRef: plateCropRef ?? null,
        challanPdfRef: uploadedPdf.objectPath,
        locationText: String(data.locationText ?? input.locationText ?? ''),
        status: 'confirmed',
      },
      { merge: true },
    );
    tx.set(
      candidateRef,
      {
        status: 'confirmed',
        challanId,
        confirmationOfficerId: input.officerId,
        confirmedAt: Timestamp.fromDate(confirmedAt),
        vehiclePlateDisplay: input.plateDisplay,
        vehiclePlateCanonical: input.plateCanonical,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  markChallanConfirmed({
    plateCanonical: input.plateCanonical,
    violationTypes: input.violationTypes,
    confirmedAtMs: confirmedAt.getTime(),
  });

  return { challanId, evidenceImageRef: evidenceRef, plateCropRef };
}

export async function loadCandidateChallanId(candidateId: string): Promise<string | undefined> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(collection(db, CANDIDATES_COLLECTION), candidateId));
  if (!snap.exists()) {
    return undefined;
  }
  const data = snap.data() as Record<string, unknown>;
  return typeof data.challanId === 'string' ? data.challanId : undefined;
}
