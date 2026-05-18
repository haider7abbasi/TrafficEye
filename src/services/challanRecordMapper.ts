import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { doc, getDoc } from '@react-native-firebase/firestore';
import { getFirebaseDb } from '../config/firebase';
import { USERS_COLLECTION } from '../config/collections';
import type { ChallanRecord } from '../types/challanRecord';
import { violationLabelsFromIds } from './challanDisplay';

function toIso(ts: FirebaseFirestoreTypes.Timestamp | string | undefined): string {
  if (!ts) {
    return new Date(0).toISOString();
  }
  if (typeof ts === 'string') {
    return ts;
  }
  return ts.toDate().toISOString();
}

const officerCache = new Map<string, { name: string; badge: string; department: string }>();

export async function loadOfficerProfile(officerId: string): Promise<{
  name: string;
  badge: string;
  department: string;
}> {
  const cached = officerCache.get(officerId);
  if (cached) {
    return cached;
  }
  try {
    const snap = await getDoc(doc(getFirebaseDb(), USERS_COLLECTION, officerId));
    const data = snap.data() as Record<string, unknown> | undefined;
    const profile = {
      name: String(data?.name ?? 'Officer'),
      badge: String(data?.badgeNumber ?? '—'),
      department: String(data?.department ?? '—'),
    };
    officerCache.set(officerId, profile);
    return profile;
  } catch {
    return { name: 'Officer', badge: '—', department: '—' };
  }
}

export async function enrichChallanRecords(records: ChallanRecord[]): Promise<ChallanRecord[]> {
  const officerIds = [...new Set(records.map(r => r.officerId))];
  const profiles = await Promise.all(
    officerIds.map(async id => ({ id, profile: await loadOfficerProfile(id) })),
  );
  const byId = Object.fromEntries(profiles.map(p => [p.id, p.profile]));
  return records.map(r => {
    const profile = byId[r.officerId];
    if (!profile) {
      return r;
    }
    return {
      ...r,
      officerName: profile.name,
      officerBadge: profile.badge,
      officerDepartment: profile.department,
    };
  });
}

export function mapFirestoreChallanDoc(
  docSnap: FirebaseFirestoreTypes.DocumentSnapshot,
): ChallanRecord | null {
  const data = docSnap.data();
  if (!data) {
    return null;
  }
  const officerId = String(data.confirmationOfficerId ?? data.officerId ?? 'unknown');
  const violationTypeIds = Array.isArray(data.violationTypes)
    ? data.violationTypes.map(v => String(v))
    : [];

  return {
    id: docSnap.id,
    officerId,
    officerName: 'Officer',
    officerBadge: '—',
    officerDepartment: '—',
    confirmedAt: toIso(data.confirmedAt as FirebaseFirestoreTypes.Timestamp | string | undefined),
    expiresAt: toIso(data.expiresAt as FirebaseFirestoreTypes.Timestamp | string | undefined),
    plateDisplay: String(data.vehiclePlateDisplay ?? data.vehiclePlateCanonical ?? ''),
    plateCanonical: String(data.vehiclePlateCanonical ?? data.vehiclePlateDisplay ?? ''),
    violationTypeIds,
    violationLabels: violationLabelsFromIds(violationTypeIds),
    locationText: String(data.locationText ?? ''),
    status: String(data.status ?? 'confirmed'),
    challanPdfRef:
      typeof data.challanPdfRef === 'string' && data.challanPdfRef.trim()
        ? data.challanPdfRef.trim()
        : undefined,
    evidenceImageRef:
      typeof data.evidenceImageRef === 'string' && data.evidenceImageRef.trim()
        ? data.evidenceImageRef.trim()
        : undefined,
    plateCropRef:
      typeof data.plateCropRef === 'string' && data.plateCropRef.trim()
        ? data.plateCropRef.trim()
        : undefined,
    createdFromCandidateId:
      typeof data.createdFromCandidateId === 'string' && data.createdFromCandidateId.trim()
        ? data.createdFromCandidateId.trim()
        : undefined,
  };
}
