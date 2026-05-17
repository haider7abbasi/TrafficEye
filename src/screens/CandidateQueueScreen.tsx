import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Alert,
  Image,
} from 'react-native';
import firestore, { FirebaseFirestoreTypes, serverTimestamp } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { CANDIDATES_COLLECTION, CHALLANS_COLLECTION } from '../config/collections';
import { ScreenLoadingCenter } from '../components/TrafficEyeLoader';
import { useApp } from '../context/AppContext';
import { useLoading } from '../context/LoadingContext';
import { normalizePlateCanonical, normalizePlateForDisplay } from '../rules/plateNormalization';
import type { SpecViolationId } from '../rules/specViolationMapping';
import { markChallanConfirmed } from '../services/dedupGate';
import { buildChallanPdfBase64 } from '../services/challanPdf';
import { cloneStorageObjectToChallan, getStorageDownloadUrl } from '../services/storageEvidence';

type CandidateQueueItem = {
  id: string;
  createdAt: string;
  sessionId?: string;
  status: string;
  violationTypes: SpecViolationId[];
  dedupDecision?: string;
  dedupSignature?: string;
  rulesFreezeVersion?: number;
  plate?: string;
  location?: string;
  evidenceImageRef?: string;
  plateCropRef?: string;
  evidenceUrl?: string;
};

function toIso(ts: FirebaseFirestoreTypes.Timestamp | string | undefined): string {
  if (!ts) {
    return new Date(0).toISOString();
  }
  if (typeof ts === 'string') {
    return ts;
  }
  return ts.toDate().toISOString();
}

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

export function CandidateQueueScreen() {
  const { user, uploadChallanPdfFromBase64 } = useApp();
  const { runWithLoading } = useLoading();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CandidateQueueItem[]>([]);
  const [plateDrafts, setPlateDrafts] = useState<Record<string, string>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [discardingId, setDiscardingId] = useState<string | null>(null);

  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid || !user) {
      setLoading(false);
      setItems([]);
      return;
    }

    const q = user.role === 'admin'
      ? firestore().collection(CANDIDATES_COLLECTION).orderBy('createdAt', 'desc').limit(100)
      : firestore()
          .collection(CANDIDATES_COLLECTION)
          .where('officerId', '==', uid)
          .orderBy('createdAt', 'desc')
          .limit(100);

    let cancelled = false;
    const unsub = q.onSnapshot(
      snap => {
        void (async () => {
          const next = await Promise.all(
            snap.docs.map(async doc => {
              const data = doc.data() as Record<string, unknown>;
              const evidenceImageRef =
                typeof data.evidenceImageRef === 'string' ? data.evidenceImageRef : undefined;
              let evidenceUrl: string | undefined;
              if (evidenceImageRef) {
                try {
                  evidenceUrl = await getStorageDownloadUrl(evidenceImageRef);
                } catch {
                  evidenceUrl = undefined;
                }
              }
              return {
                id: doc.id,
                createdAt: toIso(data.createdAt as FirebaseFirestoreTypes.Timestamp | string | undefined),
                sessionId: typeof data.sessionId === 'string' ? data.sessionId : undefined,
                status: String(data.status ?? 'pending_review'),
                violationTypes: asSpecViolationIds(data.violationTypes),
                dedupDecision: typeof data.dedupDecision === 'string' ? data.dedupDecision : undefined,
                dedupSignature: typeof data.dedupSignature === 'string' ? data.dedupSignature : undefined,
                rulesFreezeVersion:
                  typeof data.rulesFreezeVersion === 'number' ? data.rulesFreezeVersion : undefined,
                plate: data.vehiclePlateDisplay ? String(data.vehiclePlateDisplay) : undefined,
                location: data.locationText ? String(data.locationText) : undefined,
                evidenceImageRef,
                plateCropRef: typeof data.plateCropRef === 'string' ? data.plateCropRef : undefined,
                evidenceUrl,
              } satisfies CandidateQueueItem;
            }),
          );
          if (!cancelled) {
            setItems(next);
            setLoading(false);
          }
        })();
      },
      err => {
        console.warn('[Candidate queue]', err.message);
        if (!cancelled) {
          setLoading(false);
        }
      },
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [user]);

  const setPlate = (candidateId: string, value: string) => {
    setPlateDrafts(prev => ({ ...prev, [candidateId]: value }));
  };

  const discardCandidate = async (item: CandidateQueueItem) => {
    setDiscardingId(item.id);
    try {
      await firestore().collection(CANDIDATES_COLLECTION).doc(item.id).set(
        {
          status: 'discarded',
          discardedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'Failed to discard candidate.';
      Alert.alert('Discard failed', message);
    } finally {
      setDiscardingId(null);
    }
  };

  const confirmCandidate = async (item: CandidateQueueItem) => {
    const uid = auth().currentUser?.uid;
    if (!uid) {
      Alert.alert('Auth required', 'Sign in again before confirming challan.');
      return;
    }
    const rawPlate = plateDrafts[item.id] ?? item.plate ?? '';
    const plateCanonical = normalizePlateCanonical(rawPlate);
    const plateDisplay = normalizePlateForDisplay(rawPlate);
    if (!plateCanonical) {
      Alert.alert('Plate required', 'Enter and confirm the vehicle plate before challan confirmation.');
      return;
    }

    setConfirmingId(item.id);
    try {
      await runWithLoading(async () => {
      const challanId = `chal-${Date.now()}-${item.id}`;
      let evidenceRef = item.evidenceImageRef;
      let plateCropRef = item.plateCropRef;

      if (evidenceRef) {
        const copied = await cloneStorageObjectToChallan(
          evidenceRef,
          uid,
          challanId,
          'evidence.jpg',
          'image/jpeg',
        );
        evidenceRef = copied.objectPath;
      }
      if (plateCropRef) {
        const copied = await cloneStorageObjectToChallan(
          plateCropRef,
          uid,
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
        officerName: user?.name ?? 'Officer',
        officerBadge: user?.badgeNumber,
        officerDepartment: user?.department,
        plateDisplay,
        plateCanonical,
        locationText: item.location,
        violationTypes: item.violationTypes,
      });
      const uploadedPdf = await uploadChallanPdfFromBase64(challanId, pdfBase64);
      const candidateRef = firestore().collection(CANDIDATES_COLLECTION).doc(item.id);
      const challanRef = firestore().collection(CHALLANS_COLLECTION).doc(challanId);
      await firestore().runTransaction(async tx => {
        const snap = await tx.get(candidateRef);
        if (!snap.exists) {
          throw new Error('Candidate no longer exists.');
        }
        const data = snap.data() as Record<string, unknown>;
        const violationTypes = asSpecViolationIds(data.violationTypes);
        tx.set(
          challanRef,
          {
            challanId,
            officerId: uid,
            confirmationOfficerId: uid,
            createdFromCandidateId: item.id,
            rulesFreezeVersion:
              typeof data.rulesFreezeVersion === 'number'
                ? data.rulesFreezeVersion
                : (item.rulesFreezeVersion ?? 1),
            confirmedAt: firestore.Timestamp.fromDate(confirmedAt),
            expiresAt: firestore.Timestamp.fromDate(expiresAt),
            violationTypes,
            vehiclePlateDisplay: plateDisplay,
            vehiclePlateCanonical: plateCanonical,
            evidenceImageRef: evidenceRef ?? null,
            plateCropRef: plateCropRef ?? null,
            challanPdfRef: uploadedPdf.objectPath,
            locationText: String(data.locationText ?? item.location ?? ''),
            status: 'confirmed',
          },
          { merge: true },
        );
        tx.set(
          candidateRef,
          {
            status: 'confirmed',
            challanId,
            confirmationOfficerId: uid,
            confirmedAt: firestore.Timestamp.fromDate(confirmedAt),
            vehiclePlateDisplay: plateDisplay,
            vehiclePlateCanonical: plateCanonical,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      });
      markChallanConfirmed({
        plateCanonical,
        violationTypes: item.violationTypes,
        confirmedAtMs: confirmedAt.getTime(),
      });
      Alert.alert('Challan confirmed', `Reference: ${challanId}`);
      }, 'Confirming challan…');
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'Failed to confirm challan.';
      Alert.alert('Confirmation failed', message);
    } finally {
      setConfirmingId(null);
    }
  };

  if (loading) {
    return <ScreenLoadingCenter message="Loading candidates…" />;
  }

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Candidate Queue</Text>
      <Text style={styles.subtle}>
        {user?.role === 'admin' ? 'All pending candidates (admin view)' : 'Your candidates pending review'}
      </Text>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingTop: 10, gap: 10, paddingBottom: 20 }}
        ListEmptyComponent={<Text style={styles.empty}>No candidates found.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.evidenceUrl ? (
              <Image source={{ uri: item.evidenceUrl }} style={styles.thumb} resizeMode="cover" />
            ) : null}
            <Text style={styles.title}>{item.violationTypes.join(', ') || 'No violation type'}</Text>
            <Text style={styles.meta}>Status: {item.status}</Text>
            <Text style={styles.meta}>
              Time: {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
            </Text>
            {item.dedupDecision ? <Text style={styles.meta}>Dedup: {item.dedupDecision}</Text> : null}
            {item.dedupSignature ? <Text style={styles.meta}>Signature: {item.dedupSignature}</Text> : null}
            {item.plate ? <Text style={styles.meta}>Plate: {item.plate}</Text> : null}
            {item.location ? <Text style={styles.meta}>Location: {item.location}</Text> : null}
            <Text style={styles.id}>ID: {item.id}</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm plate number"
              placeholderTextColor="#9ca3af"
              value={plateDrafts[item.id] ?? item.plate ?? ''}
              onChangeText={value => setPlate(item.id, value)}
              autoCapitalize="characters"
            />
            <View style={styles.row}>
              <Pressable
                style={[styles.confirmBtn, confirmingId === item.id && styles.disabledBtn]}
                disabled={confirmingId === item.id || item.status !== 'pending_review'}
                onPress={() => confirmCandidate(item)}>
                <Text style={styles.confirmText}>
                  {confirmingId === item.id ? 'Confirming...' : 'Confirm challan'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.discardBtn, discardingId === item.id && styles.disabledBtn]}
                disabled={discardingId === item.id || item.status !== 'pending_review'}
                onPress={() => discardCandidate(item)}>
                <Text style={styles.discardText}>
                  {discardingId === item.id ? 'Discarding...' : 'Discard'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent', padding: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  heading: { fontSize: 20, fontWeight: '800', color: '#111827' },
  subtle: { color: '#6b7280', marginTop: 2 },
  empty: { marginTop: 16, color: '#6b7280' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4,
  },
  thumb: { width: '100%', height: 160, borderRadius: 8, marginBottom: 8 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 12, color: '#4b5563' },
  id: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#111827',
    backgroundColor: '#fff',
  },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#0057B8',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  discardBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  discardText: { color: '#dc2626', fontWeight: '700', fontSize: 12 },
  disabledBtn: { opacity: 0.7 },
});
