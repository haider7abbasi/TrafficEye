import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { historyScrollContentPadding } from '../navigation/historyStackLayout';
import { BadgeCheck, Car, ChevronLeft, Expand, FileText, MapPin, ShieldAlert, Trash2 } from 'lucide-react-native';
import { EvidenceImagePreviewModal } from '../components/violation/EvidenceImagePreviewModal';
import { getFirebaseAuth } from '../config/firebase';
import { useApp } from '../context/AppContext';
import { useLoading } from '../context/LoadingContext';
import type { HistoryStackParamList } from '../navigation/HistoryStackNavigator';
import { appAlert } from '../services/appAlert';
import { confirmChallanForCandidate, loadCandidateChallanId } from '../services/challanConfirmation';
import { inferSpecViolationIds } from '../services/inferSpecViolationIds';
import { normalizePlateCanonical, normalizePlateForDisplay } from '../rules/plateNormalization';
import { SPEC_VIOLATION_LABELS, type SpecViolationId } from '../rules/specViolationMapping';
import { TRAFFICEYE_RULES_FREEZE_VERSION } from '../rules';
import { canDeleteViolationRecord } from '../utils/violationRecordAccess';
import {
  ALERT_RED,
  BG_LIGHT_BLUE,
  BG_SECONDARY_BLUE,
  BRAND_ACCENT,
  PRIMARY_BLUE,
  SUCCESS_GREEN,
  SURFACE_PANEL,
  SURFACE_PANEL_BORDER,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  WHITE,
} from '../theme/brandColors';

type Route = RouteProp<HistoryStackParamList, 'ViolationDetail'>;
type Nav = NativeStackNavigationProp<HistoryStackParamList, 'ViolationDetail'>;

export function ViolationDetailScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const scrollPadding = historyScrollContentPadding(insets, width);
  const { records, updateRecord, deleteRecord, createCandidate, uploadCandidateEvidence, uploadChallanPdfFromBase64, user } =
    useApp();
  const { runWithLoading } = useLoading();

  const record = records.find(r => r.id === route.params.recordId);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [evidenceVerified, setEvidenceVerified] = useState(false);
  const [plateDraft, setPlateDraft] = useState(record?.vehicleNumber ?? '');
  const [challanId, setChallanId] = useState<string | undefined>(record?.challanId);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete = canDeleteViolationRecord(user, challanId);

  const imageHeight = Math.min(320, Math.max(200, width * 0.52));
  const hasViolations = (record?.violations.length ?? 0) > 0;

  const specViolationIds = useMemo((): SpecViolationId[] => {
    if (!record) {
      return [];
    }
    if (record.specViolationIds?.length) {
      return record.specViolationIds;
    }
    return inferSpecViolationIds(record.violations);
  }, [record]);

  useEffect(() => {
    if (!record) {
      return;
    }
    setPlateDraft(record.vehicleNumber ?? '');
    setChallanId(record.challanId);
    setEvidenceVerified(false);
    if (record.challanId || !record.candidateId) {
      return;
    }
    void loadCandidateChallanId(record.candidateId).then(id => {
      if (id) {
        setChallanId(id);
        void updateRecord(record.id, { challanId: id });
      }
    });
  }, [record, updateRecord]);

  const openFullscreenPreview = useCallback(() => {
    setPreviewModalVisible(true);
  }, []);

  const ensureCandidate = useCallback(async () => {
    if (!record || !user) {
      throw new Error('Record not available.');
    }
    const plateDisplay = normalizePlateForDisplay(plateDraft);
    const plateCanonical = normalizePlateCanonical(plateDraft);
    if (!plateCanonical) {
      throw new Error('Enter a valid vehicle registration plate before issuing the challan.');
    }
    if (specViolationIds.length === 0) {
      throw new Error('No violation types are associated with this record.');
    }

    let candidateId = record.candidateId ?? `cand-hist-${record.id}`;
    let evidenceImageRef = record.evidenceImageRef;

    const localUri = record.imageUri?.trim();
    if (localUri && !/^https?:\/\//i.test(localUri)) {
      try {
        const uploaded = await uploadCandidateEvidence(candidateId, localUri, {
          contentType: 'image/jpeg',
        });
        evidenceImageRef = uploaded.objectPath;
      } catch (e) {
        if (!evidenceImageRef) {
          throw new Error(
            'Evidence photo is no longer on this device. Re-capture the violation or use a record with cloud evidence.',
          );
        }
        console.warn('[ensureCandidate] Using existing cloud evidence; local file not found.', e);
      }
    } else if (!evidenceImageRef) {
      throw new Error('No evidence image is available for this record.');
    }

    await createCandidate({
      candidateId,
      sessionId: record.sessionId,
      violationTypes: specViolationIds,
      dedupDecision: 'create',
      evidenceImageRef,
      locationText: record.location,
      vehiclePlateDisplay: plateDisplay,
      vehiclePlateCanonical: plateCanonical,
    });
    await updateRecord(record.id, {
      candidateId,
      evidenceImageRef,
      specViolationIds,
      vehicleNumber: plateDisplay,
    });
    return { candidateId, plateDisplay, plateCanonical, evidenceImageRef };
  }, [createCandidate, plateDraft, record, specViolationIds, updateRecord, uploadCandidateEvidence, user]);

  const handleDeleteRecord = useCallback(() => {
    if (!record || !canDelete || deleting) {
      return;
    }
    const hasChallan = Boolean(challanId);
    const title = hasChallan ? 'Delete issued record?' : 'Delete violation record?';
    const message = hasChallan
      ? `This removes the violation and challan reference (${challanId}) from your history. This action cannot be undone.`
      : 'This removes the violation from your history. This action cannot be undone.';

    appAlert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setDeleting(true);
            try {
              await runWithLoading(async () => {
                await deleteRecord(record.id);
              }, 'Deleting record…');
              navigation.goBack();
            } catch (e) {
              const errMsg = (e as { message?: string })?.message ?? 'Could not delete this record.';
              appAlert('Delete failed', errMsg);
            } finally {
              setDeleting(false);
            }
          })();
        },
      },
    ]);
  }, [canDelete, challanId, deleteRecord, deleting, navigation, record, runWithLoading]);

  const handleGenerateChallan = async () => {
    if (!record || !user) {
      return;
    }
    if (challanId) {
      appAlert('Challan already issued', `Reference ${challanId} is linked to this record.`);
      return;
    }
    if (!evidenceVerified) {
      appAlert(
        'Review evidence first',
        'Open the photo in full screen and tap "I have verified this evidence" before you can issue a challan.',
      );
      openFullscreenPreview();
      return;
    }
    const plateCanonical = normalizePlateCanonical(plateDraft);
    if (!plateCanonical) {
      appAlert('Plate number required', 'Enter the vehicle registration plate before issuing the challan.');
      return;
    }

    setGenerating(true);
    try {
      await runWithLoading(async () => {
        const prepared = await ensureCandidate();
        const uid = getFirebaseAuth().currentUser?.uid;
        if (!uid) {
          throw new Error('Sign in again to issue a challan.');
        }
        const result = await confirmChallanForCandidate({
          candidateId: prepared.candidateId,
          officerId: uid,
          officer: user,
          plateDisplay: prepared.plateDisplay,
          plateCanonical: prepared.plateCanonical,
          violationTypes: specViolationIds,
          locationText: record.location,
          evidenceImageRef: prepared.evidenceImageRef ?? record.evidenceImageRef,
          localEvidenceUri: record.imageUri,
          localEvidenceContentType: 'image/jpeg',
          rulesFreezeVersion: TRAFFICEYE_RULES_FREEZE_VERSION,
          uploadChallanPdfFromBase64,
        });
        setChallanId(result.challanId);
        await updateRecord(record.id, {
          challanId: result.challanId,
          candidateId: prepared.candidateId,
          vehicleNumber: prepared.plateDisplay,
        });
        appAlert('Challan issued', `Reference number: ${result.challanId}`);
      }, 'Issuing challan…');
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'Could not issue the challan. Try again.';
      appAlert('Could not issue challan', message);
    } finally {
      setGenerating(false);
    }
  };

  if (!record) {
    return (
      <View style={styles.missingRoot}>
        <Text style={styles.missingTitle}>Record not found</Text>
        <Pressable style={styles.btnSecondary} onPress={() => navigation.goBack()}>
          <Text style={styles.btnSecondaryText}>Back to history</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Pressable
        style={({ pressed }) => [styles.backRow, pressed && styles.backRowPressed]}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Back to history">
        <ChevronLeft size={22} color={PRIMARY_BLUE} strokeWidth={2.5} />
        <Text style={styles.backLabel}>History</Text>
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, scrollPadding, styles.scrollContent]}
        showsVerticalScrollIndicator={false}>
        <Pressable
          style={({ pressed }) => [styles.imageCard, pressed && styles.imageCardPressed]}
          onPress={openFullscreenPreview}
          accessibilityRole="imagebutton"
          accessibilityLabel="Open full screen evidence review">
          <Image
            source={{ uri: record.imageUri }}
            style={[styles.image, { height: imageHeight }]}
            resizeMode="contain"
          />
          <View style={styles.expandBadge}>
            <Expand size={20} color={WHITE} strokeWidth={2.2} />
          </View>
        </Pressable>

        <View style={styles.card}>
            <Text style={styles.sectionTitle}>Violation summary</Text>
            {hasViolations ? (
              <View style={styles.tagsWrap}>
                {record.violations.map((v, i) => (
                  <View key={`${v}-${i}`} style={styles.tag}>
                    <Text style={styles.tagText}>{v}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.clearText}>No violations were recorded for this capture.</Text>
            )}

            <View style={styles.metaRow}>
              <MapPin size={16} color={TEXT_MUTED} strokeWidth={2} />
              <Text style={styles.metaText}>{record.location}</Text>
            </View>
            <Text style={styles.metaSub}>
              {new Date(record.timestamp).toLocaleString()} · Confidence {record.confidence}%
            </Text>

            {hasViolations ? (
              <>
                <Text style={styles.label}>Registration plate</Text>
                <View style={styles.plateRow}>
                  <Car size={18} color={TEXT_MUTED} strokeWidth={2} />
                  <TextInput
                    style={styles.plateInput}
                    value={plateDraft}
                    onChangeText={setPlateDraft}
                    placeholder="e.g. ABC-1234"
                    placeholderTextColor={TEXT_MUTED}
                    autoCapitalize="characters"
                    editable={!challanId && !generating}
                  />
                </View>

                {challanId ? (
                  <View style={styles.challanBadge}>
                    <BadgeCheck size={20} color={SUCCESS_GREEN} strokeWidth={2.2} />
                    <View style={styles.challanBadgeText}>
                      <Text style={styles.challanBadgeTitle}>Challan issued</Text>
                      <Text style={styles.challanBadgeId}>{challanId}</Text>
                    </View>
                  </View>
                ) : (
                  <>
                    {!evidenceVerified ? (
                      <View style={styles.verifyBanner}>
                        <ShieldAlert size={18} color={PRIMARY_BLUE} strokeWidth={2.2} />
                        <Text style={styles.verifyBannerText}>
                          Review the evidence photo in full screen before you can issue a challan.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.verifiedBanner}>
                        <BadgeCheck size={18} color={SUCCESS_GREEN} strokeWidth={2.2} />
                        <Text style={styles.verifiedBannerText}>Evidence reviewed and confirmed</Text>
                      </View>
                    )}
                    <Pressable
                      style={({ pressed }) => [
                        styles.btnPrimary,
                        (!evidenceVerified || generating) && styles.btnPrimaryDisabled,
                        pressed && !generating && styles.btnPressed,
                      ]}
                      onPress={() => void handleGenerateChallan()}
                      disabled={generating}
                      accessibilityRole="button"
                      accessibilityLabel="Issue challan"
                      accessibilityState={{ disabled: generating }}>
                      <FileText size={20} color={WHITE} strokeWidth={2.2} />
                      <Text style={styles.btnPrimaryText}>
                        {generating ? 'Issuing…' : 'Issue challan'}
                      </Text>
                    </Pressable>
                  </>
                )}

                {specViolationIds.length > 0 ? (
                  <Text style={styles.specHint}>
                    Violation codes: {specViolationIds.map(id => SPEC_VIOLATION_LABELS[id]).join(' · ')}
                  </Text>
                ) : null}
              </>
            ) : null}

            {canDelete ? (
              <Pressable
                style={({ pressed }) => [
                  styles.btnDelete,
                  (deleting || pressed) && styles.btnDeletePressed,
                ]}
                onPress={handleDeleteRecord}
                disabled={deleting || generating}
                accessibilityRole="button"
                accessibilityLabel={challanId ? 'Delete record with challan' : 'Delete violation record'}>
                <Trash2 size={18} color={ALERT_RED} strokeWidth={2.2} />
                <Text style={styles.btnDeleteText}>
                  {deleting ? 'Deleting…' : 'Delete record'}
                </Text>
              </Pressable>
            ) : challanId ? (
              <Text style={styles.deleteHint}>
                Only an administrator can delete records after a challan has been issued.
              </Text>
            ) : null}
        </View>
      </ScrollView>

      <EvidenceImagePreviewModal
        visible={previewModalVisible}
        imageUri={record.imageUri}
        previewOnly={Boolean(challanId)}
        onClose={() => setPreviewModalVisible(false)}
        onVerified={challanId ? undefined : () => setEvidenceVerified(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  backRowPressed: { opacity: 0.75 },
  backLabel: { fontSize: 16, fontWeight: '700', color: PRIMARY_BLUE },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 0 },
  content: { gap: 14 },
  imageCard: {
    backgroundColor: SURFACE_PANEL,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
    overflow: 'hidden',
    position: 'relative',
  },
  imageCardPressed: { opacity: 0.95 },
  image: { width: '100%', backgroundColor: '#0f172a' },
  expandBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 87, 184, 0.92)',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  card: {
    backgroundColor: SURFACE_PANEL,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { color: ALERT_RED, fontSize: 12, fontWeight: '700' },
  clearText: { fontSize: 14, color: TEXT_SECONDARY },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  metaText: { flex: 1, fontSize: 14, color: TEXT_SECONDARY },
  metaSub: { fontSize: 12, color: TEXT_MUTED },
  label: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: BG_SECONDARY_BLUE,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: BG_LIGHT_BLUE,
    minHeight: 48,
  },
  plateInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    paddingVertical: 10,
  },
  challanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  challanBadgeText: { flex: 1, gap: 2 },
  challanBadgeTitle: { fontSize: 14, fontWeight: '800', color: SUCCESS_GREEN },
  challanBadgeId: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: '600' },
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: BG_LIGHT_BLUE,
    borderWidth: 1,
    borderColor: BG_SECONDARY_BLUE,
  },
  verifyBannerText: { flex: 1, fontSize: 13, lineHeight: 18, color: TEXT_SECONDARY, fontWeight: '600' },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  verifiedBannerText: { flex: 1, fontSize: 13, fontWeight: '700', color: SUCCESS_GREEN },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: PRIMARY_BLUE,
  },
  btnPrimaryDisabled: { opacity: 0.45 },
  btnPrimaryText: { color: WHITE, fontSize: 16, fontWeight: '800' },
  btnPressed: { opacity: 0.9 },
  specHint: { fontSize: 12, color: TEXT_MUTED, lineHeight: 17 },
  missingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  missingTitle: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY, marginBottom: 16 },
  btnSecondary: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: BG_LIGHT_BLUE,
    borderWidth: 1,
    borderColor: BG_SECONDARY_BLUE,
  },
  btnSecondaryText: { color: BRAND_ACCENT, fontWeight: '700' },
  btnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  btnDeletePressed: { opacity: 0.88 },
  btnDeleteText: { color: ALERT_RED, fontSize: 15, fontWeight: '800' },
  deleteHint: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 17,
    color: TEXT_MUTED,
    fontStyle: 'italic',
  },
});
