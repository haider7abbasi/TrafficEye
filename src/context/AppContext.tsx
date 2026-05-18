import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '../config/firebase';
import type { UploadedStorageObject } from '../services/storageEvidence';
import {
  CANDIDATES_COLLECTION,
  INTAKE_SESSIONS_COLLECTION,
  USERS_COLLECTION,
  VIOLATIONS_SUBCOLLECTION,
} from '../config/collections';
import { TRAFFICEYE_RULES_FREEZE_VERSION } from '../rules';
import type { SpecViolationId } from '../rules/specViolationMapping';
import { bootstrapFirebase } from '../config/bootstrapFirebase';
import {
  deleteStorageObject,
  getStorageDownloadUrl,
  uploadCandidateEvidenceImage,
  uploadCandidatePlateCropImage,
  uploadChallanPdfBase64,
  uploadChallanPdfFile,
  uploadSessionFrameImage,
} from '../services/storageEvidence';
import { waitForNativeFirebaseReady } from '../utils/waitForNativeFirebase';

export type ViolationRecord = {
  id: string;
  imageUri: string;
  violations: string[];
  confidence: number;
  location: string;
  timestamp: string;
  vehicleNumber?: string;
  candidateId?: string;
  challanId?: string;
  specViolationIds?: SpecViolationId[];
  evidenceImageRef?: string;
  sessionId?: string;
};

export type User = {
  name: string;
  email: string;
  role: 'officer' | 'admin';
  approved: boolean;
  phone: string;
  department: string;
  location: string;
  badgeNumber: string;
};

type AppContextType = {
  user: User | null;
  hasSession: boolean;
  hasAccess: boolean;
  authReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  records: ViolationRecord[];
  addRecord: (record: ViolationRecord) => Promise<void>;
  updateRecord: (id: string, patch: Partial<ViolationRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  uploadCandidateEvidence: (
    candidateId: string,
    localUri: string,
    options?: { contentType?: string },
  ) => Promise<UploadedStorageObject>;
  uploadCandidatePlateCrop: (candidateId: string, localUri: string) => Promise<UploadedStorageObject>;
  uploadChallanPdf: (challanId: string, localUri: string) => Promise<UploadedStorageObject>;
  uploadChallanPdfFromBase64: (challanId: string, pdfBase64: string) => Promise<UploadedStorageObject>;
  uploadSessionFrame: (
    sessionId: string,
    frameId: string,
    localUri: string,
  ) => Promise<UploadedStorageObject>;
  createCandidate: (input: {
    candidateId: string;
    sessionId?: string;
    violationTypes: SpecViolationId[];
    dedupDecision?: 'create' | 'merge' | 'suppress';
    dedupSignature?: string;
    evidenceImageRef?: string;
    plateCropRef?: string;
    plateBox?: { x: number; y: number; width: number; height: number; confidence: number };
    locationText?: string;
    vehiclePlateDisplay?: string;
    vehiclePlateCanonical?: string;
  }) => Promise<void>;
  createIntakeSession: (mode: 'still' | 'upload' | 'video' | 'live') => Promise<string>;
  getStorageUrl: (objectPath: string) => Promise<string>;
  deleteStoragePath: (objectPath: string) => Promise<void>;
};

const AppContext = createContext<AppContextType | null>(null);

function toIso(ts: FirebaseFirestoreTypes.Timestamp | Date | string | undefined): string {
  if (!ts) {
    return new Date().toISOString();
  }
  if (typeof ts === 'string') {
    return ts;
  }
  if (ts instanceof Date) {
    return ts.toISOString();
  }
  if (typeof (ts as FirebaseFirestoreTypes.Timestamp).toDate === 'function') {
    return (ts as FirebaseFirestoreTypes.Timestamp).toDate().toISOString();
  }
  return new Date().toISOString();
}

function mapViolationDoc(
  docSnap: FirebaseFirestoreTypes.DocumentSnapshot,
): ViolationRecord | null {
  const data = docSnap.data();
  if (!data) {
    return null;
  }
  return {
    id: docSnap.id,
    imageUri: String(data.imageUri ?? ''),
    violations: Array.isArray(data.violations) ? data.violations : [],
    confidence: Number(data.confidence ?? 0),
    location: String(data.location ?? ''),
    timestamp: toIso(data.timestamp as FirebaseFirestoreTypes.Timestamp),
    vehicleNumber: data.vehicleNumber != null ? String(data.vehicleNumber) : undefined,
    candidateId: data.candidateId != null ? String(data.candidateId) : undefined,
    challanId: data.challanId != null ? String(data.challanId) : undefined,
    specViolationIds: Array.isArray(data.specViolationIds)
      ? (data.specViolationIds as SpecViolationId[])
      : undefined,
    evidenceImageRef: data.evidenceImageRef != null ? String(data.evidenceImageRef) : undefined,
    sessionId: data.sessionId != null ? String(data.sessionId) : undefined,
  };
}

function mapUserProfile(
  data: FirebaseFirestoreTypes.DocumentData | undefined,
  fbUser: FirebaseAuthTypes.User,
): User {
  const role: User['role'] = data?.role === 'admin' ? 'admin' : 'officer';
  return {
    name: String(data?.name ?? fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'Officer'),
    email: String(data?.email ?? fbUser.email ?? ''),
    role,
    approved: role === 'admin' ? true : data?.approved === true,
    phone: String(data?.phone ?? ''),
    department: String(data?.department ?? 'Traffic Enforcement'),
    location: String(data?.location ?? ''),
    badgeNumber: String(data?.badgeNumber ?? ''),
  };
}

async function ensureUserProfile(fbUser: FirebaseAuthTypes.User): Promise<User> {
  const db = getFirebaseDb();
  const userRef = doc(collection(db, USERS_COLLECTION), fbUser.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    const profile: User = {
      name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Officer',
      email: fbUser.email || '',
      role: 'officer',
      approved: false,
      phone: '',
      department: 'Traffic Enforcement',
      location: '',
      badgeNumber: '',
    };
    await setDoc(userRef, profile);
    return profile;
  }
  return mapUserProfile(snap.data(), fbUser);
}

/** Keep auth overlay visible until the navigator can switch stacks. */
function settleUiAfterAuth(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 280);
      });
    });
  });
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<ViolationRecord[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const userRef = useRef<User | null>(null);
  const sessionWaitersRef = useRef<Array<(profile: User) => void>>([]);
  const hasSession = !!user;
  const hasAccess = !!user && (user.role === 'admin' || user.approved);

  userRef.current = user;

  useEffect(() => {
    if (!user) {
      return;
    }
    const waiters = sessionWaitersRef.current.splice(0);
    waiters.forEach(fn => fn(user));
  }, [user]);

  useEffect(() => {
    let unsubViolations: (() => void) | undefined;
    let unsubAuth: (() => void) | undefined;
    let cancelled = false;

    waitForNativeFirebaseReady()
      .then(() => {
        if (cancelled) {
          return;
        }
        bootstrapFirebase();
        unsubAuth = onAuthStateChanged(getFirebaseAuth(), async fbUser => {
          unsubViolations?.();
          unsubViolations = undefined;

          if (!fbUser) {
            setUser(null);
            setRecords([]);
            setAuthReady(true);
            return;
          }

          try {
            const profile = await ensureUserProfile(fbUser);
            setUser(profile);

            const db = getFirebaseDb();
            const violationsQuery = query(
              collection(db, USERS_COLLECTION, fbUser.uid, VIOLATIONS_SUBCOLLECTION),
              orderBy('timestamp', 'desc'),
            );

            unsubViolations = onSnapshot(
              violationsQuery,
              snap => {
                const list: ViolationRecord[] = [];
                snap.forEach(d => {
                  const v = mapViolationDoc(d);
                  if (v) {
                    list.push(v);
                  }
                });
                setRecords(list);
              },
              err => {
                console.warn('[Firestore violations]', err.message);
              },
            );
          } catch (e) {
            console.warn('[AppContext auth]', e);
            setUser(null);
            setRecords([]);
          } finally {
            setAuthReady(true);
          }
        });
      })
      .catch(e => {
        console.warn('[Firebase]', e?.message ?? e);
        if (!cancelled) {
          setAuthReady(true);
        }
      });

    return () => {
      cancelled = true;
      unsubViolations?.();
      unsubAuth?.();
    };
  }, []);

  const waitForUserProfileInState = useCallback((timeoutMs = 20000): Promise<User> => {
    if (userRef.current) {
      return Promise.resolve(userRef.current);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Could not load your profile. Please try again.'));
      }, timeoutMs);
      sessionWaitersRef.current.push(profile => {
        clearTimeout(timer);
        resolve(profile);
      });
    });
  }, []);

  const hydrateSessionProfile = useCallback(async (fbUser: FirebaseAuthTypes.User): Promise<User> => {
    if (userRef.current) {
      return userRef.current;
    }
    const profile = await ensureUserProfile(fbUser);
    userRef.current = profile;
    setUser(profile);
    const waiters = sessionWaitersRef.current.splice(0);
    waiters.forEach(fn => fn(profile));
    return profile;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const authInstance = getFirebaseAuth();
      await signInWithEmailAndPassword(authInstance, email.trim().toLowerCase(), password);
      const fbUser = authInstance.currentUser;
      if (!fbUser) {
        throw new Error('Sign-in failed. Please try again.');
      }
      await hydrateSessionProfile(fbUser);
      await waitForUserProfileInState();
      await settleUiAfterAuth();
    },
    [hydrateSessionProfile, waitForUserProfileInState],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();
      const authInstance = getFirebaseAuth();
      const cred = await createUserWithEmailAndPassword(authInstance, cleanEmail, password);
      if (cleanName) {
        await updateProfile(cred.user, { displayName: cleanName });
      }
      await setDoc(
        doc(collection(getFirebaseDb(), USERS_COLLECTION), cred.user.uid),
        {
          name: cleanName || cleanEmail.split('@')[0] || 'Officer',
          email: cleanEmail,
          role: 'officer',
          approved: false,
          phone: '',
          department: 'Traffic Enforcement',
          location: '',
          badgeNumber: '',
        },
        { merge: true },
      );
      await hydrateSessionProfile(cred.user);
      await waitForUserProfileInState();
      await settleUiAfterAuth();
    },
    [hydrateSessionProfile, waitForUserProfileInState],
  );

  const logout = useCallback(async () => {
    await signOut(getFirebaseAuth());
  }, []);

  const updateUser = useCallback(async (data: Partial<User>) => {
    const uid = getFirebaseAuth().currentUser?.uid;
    if (!uid) {
      return;
    }
    setUser(prev => (prev ? { ...prev, ...data } : prev));
    const { email: _omitEmail, ...patch } = data;
    if (Object.keys(patch).length > 0) {
      await setDoc(doc(collection(getFirebaseDb(), USERS_COLLECTION), uid), patch, { merge: true });
    }
  }, []);

  const addRecord = useCallback(async (record: ViolationRecord) => {
    const uid = getFirebaseAuth().currentUser?.uid;
    if (!uid) {
      return;
    }
    await setDoc(
      doc(collection(getFirebaseDb(), USERS_COLLECTION, uid, VIOLATIONS_SUBCOLLECTION), record.id),
      {
        imageUri: record.imageUri,
        violations: record.violations,
        confidence: record.confidence,
        location: record.location,
        timestamp: Timestamp.fromDate(new Date(record.timestamp)),
        vehicleNumber: record.vehicleNumber ?? null,
        candidateId: record.candidateId ?? null,
        challanId: record.challanId ?? null,
        specViolationIds: record.specViolationIds ?? [],
        evidenceImageRef: record.evidenceImageRef ?? null,
        sessionId: record.sessionId ?? null,
      },
    );
    setRecords(prev => {
      const idx = prev.findIndex(r => r.id === record.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = record;
        return next;
      }
      return [record, ...prev];
    });
  }, []);

  const updateRecord = useCallback(async (id: string, patch: Partial<ViolationRecord>) => {
    const uid = getFirebaseAuth().currentUser?.uid;
    if (!uid) {
      return;
    }
    const ref = doc(collection(getFirebaseDb(), USERS_COLLECTION, uid, VIOLATIONS_SUBCOLLECTION), id);
    const firestorePatch: Record<string, unknown> = {};
    if (patch.vehicleNumber !== undefined) {
      firestorePatch.vehicleNumber = patch.vehicleNumber ?? null;
    }
    if (patch.candidateId !== undefined) {
      firestorePatch.candidateId = patch.candidateId ?? null;
    }
    if (patch.challanId !== undefined) {
      firestorePatch.challanId = patch.challanId ?? null;
    }
    if (patch.specViolationIds !== undefined) {
      firestorePatch.specViolationIds = patch.specViolationIds ?? [];
    }
    if (patch.evidenceImageRef !== undefined) {
      firestorePatch.evidenceImageRef = patch.evidenceImageRef ?? null;
    }
    if (patch.sessionId !== undefined) {
      firestorePatch.sessionId = patch.sessionId ?? null;
    }
    if (Object.keys(firestorePatch).length > 0) {
      await setDoc(ref, firestorePatch, { merge: true });
    }
    setRecords(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const deleteRecord = useCallback(async (id: string) => {
    const uid = getFirebaseAuth().currentUser?.uid;
    if (!uid) {
      throw new Error('Sign in again to delete this record.');
    }
    await deleteDoc(
      doc(collection(getFirebaseDb(), USERS_COLLECTION, uid, VIOLATIONS_SUBCOLLECTION), id),
    );
    setRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  const uploadCandidateEvidence = useCallback(
    async (candidateId: string, localUri: string, options?: { contentType?: string }) => {
      const uid = getFirebaseAuth().currentUser?.uid;
      if (!uid) {
        throw new Error('Must be authenticated to upload candidate evidence.');
      }
      return uploadCandidateEvidenceImage(uid, candidateId, localUri, options?.contentType);
    },
    [],
  );

  const uploadCandidatePlateCrop = useCallback(
    async (candidateId: string, localUri: string) => {
      const uid = getFirebaseAuth().currentUser?.uid;
      if (!uid) {
        throw new Error('Must be authenticated to upload candidate plate crop.');
      }
      return uploadCandidatePlateCropImage(uid, candidateId, localUri);
    },
    [],
  );

  const uploadChallanPdf = useCallback(
    async (challanId: string, localUri: string) => {
      const uid = getFirebaseAuth().currentUser?.uid;
      if (!uid) {
        throw new Error('Must be authenticated to upload challan PDF.');
      }
      return uploadChallanPdfFile(uid, challanId, localUri);
    },
    [],
  );

  const uploadSessionFrame = useCallback(
    async (sessionId: string, frameId: string, localUri: string) => {
      const uid = getFirebaseAuth().currentUser?.uid;
      if (!uid) {
        throw new Error('Must be authenticated to upload session frame.');
      }
      return uploadSessionFrameImage(uid, sessionId, frameId, localUri);
    },
    [],
  );

  const uploadChallanPdfFromBase64 = useCallback(
    async (challanId: string, pdfBase64: string) => {
      const uid = getFirebaseAuth().currentUser?.uid;
      if (!uid) {
        throw new Error('Must be authenticated to upload challan PDF.');
      }
      return uploadChallanPdfBase64(uid, challanId, pdfBase64);
    },
    [],
  );

  const createCandidate = useCallback(
    async (input: {
      candidateId: string;
      sessionId?: string;
      violationTypes: SpecViolationId[];
      dedupDecision?: 'create' | 'merge' | 'suppress';
      dedupSignature?: string;
      evidenceImageRef?: string;
      plateCropRef?: string;
      plateBox?: { x: number; y: number; width: number; height: number; confidence: number };
      locationText?: string;
      vehiclePlateDisplay?: string;
      vehiclePlateCanonical?: string;
    }) => {
      const uid = getFirebaseAuth().currentUser?.uid;
      if (!uid) {
        throw new Error('Must be authenticated to create candidate.');
      }
      const payload: Record<string, unknown> = {
        officerId: uid,
        sessionId: input.sessionId ?? null,
        rulesFreezeVersion: TRAFFICEYE_RULES_FREEZE_VERSION,
        violationTypes: input.violationTypes,
        dedupDecision: input.dedupDecision ?? 'create',
        dedupSignature: input.dedupSignature ?? null,
        evidenceImageRef: input.evidenceImageRef ?? null,
        plateCropRef: input.plateCropRef ?? null,
        plateBox: input.plateBox ?? null,
        locationText: input.locationText ?? null,
        status: 'pending_review',
        updatedAt: serverTimestamp(),
      };
      const display = input.vehiclePlateDisplay?.trim();
      if (display) {
        payload.vehiclePlateDisplay = display;
        payload.vehiclePlateCanonical =
          input.vehiclePlateCanonical?.trim() || display;
      }
      if (input.dedupDecision === 'merge') {
        payload.mergedAt = serverTimestamp();
        payload.mergeCount = increment(1);
      } else {
        payload.createdAt = serverTimestamp();
      }
      await setDoc(
        doc(collection(getFirebaseDb(), CANDIDATES_COLLECTION), input.candidateId),
        payload,
        { merge: true },
      );
    },
    [],
  );

  const createIntakeSession = useCallback(
    async (mode: 'still' | 'upload' | 'video' | 'live') => {
      const uid = getFirebaseAuth().currentUser?.uid;
      if (!uid) {
        throw new Error('Must be authenticated to create intake session.');
      }
      const sessionRef = doc(collection(getFirebaseDb(), INTAKE_SESSIONS_COLLECTION));
      await setDoc(sessionRef, {
        officerId: uid,
        mode,
        startedAt: serverTimestamp(),
      });
      return sessionRef.id;
    },
    [],
  );

  const getStorageUrl = useCallback(async (objectPath: string) => {
    return getStorageDownloadUrl(objectPath);
  }, []);

  const deleteStoragePath = useCallback(async (objectPath: string) => {
    await deleteStorageObject(objectPath);
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        hasSession,
        hasAccess,
        authReady,
        login,
        register,
        logout,
        updateUser,
        records,
        addRecord,
        updateRecord,
        deleteRecord,
        uploadCandidateEvidence,
        uploadCandidatePlateCrop,
        uploadChallanPdf,
        uploadChallanPdfFromBase64,
        uploadSessionFrame,
        createCandidate,
        createIntakeSession,
        getStorageUrl,
        deleteStoragePath,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
