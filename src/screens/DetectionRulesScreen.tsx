import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { TrafficEyeLoader } from '../components/TrafficEyeLoader';
import firestore from '@react-native-firebase/firestore';
import {
  CHALLAN_PDF_FIELDS,
  PLATE_NORMALIZATION_RULES_SUMMARY,
  ROBOFLOW_CLASS_SPEC_SHEET,
  TRAFFICEYE_RULES_FREEZE_VERSION,
  normalizePlateCanonical,
  normalizePlateForDisplay,
} from '../rules';
import {
  CANDIDATES_COLLECTION,
  CHALLANS_COLLECTION,
  INTAKE_SESSIONS_COLLECTION,
  TRAFFIC_RULES_COLLECTION,
  USERS_COLLECTION,
  VIOLATIONS_SUBCOLLECTION,
} from '../config/collections';
import {
  candidateEvidenceObjectPath,
  challanBundleObjectPath,
  sessionFrameObjectPath,
} from '../config/storagePaths';
import { getRoboflowDeployRegistry, listRoboflowTrafficProjects } from '../config/roboflowModels';
import {
  BRAND_ACCENT,
  SURFACE_PANEL,
  SURFACE_PANEL_BORDER,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '../theme/brandColors';

export function DetectionRulesScreen() {
  const plateExample = ' ab-12 c  ';
  const display = normalizePlateForDisplay(plateExample);
  const canonical = normalizePlateCanonical(plateExample);
  const roboflowDeploy = useMemo(() => getRoboflowDeployRegistry(), []);
  const roboflowProjectOrder = useMemo(() => [...listRoboflowTrafficProjects()], []);
  const [loadingRules, setLoadingRules] = useState(true);
  const [rules, setRules] = useState<{ id: string; title: string; details: string }[]>([]);

  useEffect(() => {
    const unsub = firestore()
      .collection(TRAFFIC_RULES_COLLECTION)
      .where('active', '==', true)
      .orderBy('title', 'asc')
      .onSnapshot(
        snap => {
          const next: { id: string; title: string; details: string }[] = [];
          snap.forEach(doc => {
            const data = doc.data();
            next.push({
              id: doc.id,
              title: String(data.title ?? ''),
              details: String(data.details ?? ''),
            });
          });
          setRules(next);
          setLoadingRules(false);
        },
        err => {
          console.warn('[Detection rules read]', err.message);
          setLoadingRules(false);
        },
      );
    return unsub;
  }, []);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>On-device violation logic</Text>
        <Text style={styles.cardSub}>
          Vehicle model must detect Bus, car, truck, or Motorcycle before any challan is raised from specialists.
        </Text>
        <Text style={styles.body}>
          Phone or seatbelt detections alone (no vehicle box) → no violation. Car: mobile needs using/calling/texting
          classes; bike also counts phone_in_hand. Combined outcomes show as one headline (e.g. Mobile+Seatbelt
          Violation).
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Traffic rules (live from Firestore)</Text>
        <Text style={styles.cardSub}>Collection: {TRAFFIC_RULES_COLLECTION}</Text>
        {loadingRules ? (
          <TrafficEyeLoader size="small" color={BRAND_ACCENT} />
        ) : rules.length === 0 ? (
          <Text style={styles.note}>No active traffic rules found yet.</Text>
        ) : (
          rules.map((r, i) => (
            <View key={r.id} style={[styles.tableRow, i > 0 && styles.tableRowBorder]}>
              <Text style={styles.ruleTitle}>{r.title}</Text>
              <Text style={styles.note}>{r.details}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rules freeze</Text>
        <Text style={styles.body}>
          Mapping, plate rules, and PDF field keys are versioned together. When you change any of
          them, bump <Text style={styles.mono}>TRAFFICEYE_RULES_FREEZE_VERSION</Text> in{' '}
          <Text style={styles.mono}>src/rules/rulesFreeze.ts</Text> (currently{' '}
          <Text style={styles.mono}>{String(TRAFFICEYE_RULES_FREEZE_VERSION)}</Text>).
        </Text>
        <Text style={styles.cardSub}>Firestore collection ids (section 4 blueprint)</Text>
        <Text style={styles.monoSmall}>
          {USERS_COLLECTION} / … / {VIOLATIONS_SUBCOLLECTION}
          {'\n'}
          {TRAFFIC_RULES_COLLECTION}
          {'\n'}
          {INTAKE_SESSIONS_COLLECTION}
          {'\n'}
          {CANDIDATES_COLLECTION}
          {'\n'}
          {CHALLANS_COLLECTION}
        </Text>
        <Text style={styles.note}>
          TypeScript shapes: <Text style={styles.mono}>src/types/challanBlueprint.ts</Text> (
          <Text style={styles.mono}>CandidateRecord</Text>, <Text style={styles.mono}>ChallanRecord</Text>
          ); sessions: <Text style={styles.mono}>src/types/intakeSessionBlueprint.ts</Text>.
        </Text>
        <Text style={styles.cardSub}>Storage object layout (see storage.rules)</Text>
        <Text style={styles.monoSmall}>
          {candidateEvidenceObjectPath('{officerId}', '{candidateId}', 'evidence.jpg')}
          {'\n'}
          {challanBundleObjectPath('{officerId}', '{challanId}', 'challan.pdf')}
          {'\n'}
          {sessionFrameObjectPath('{officerId}', '{sessionId}', 'frame-0001.jpg')}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Roboflow hosted models (.env)</Text>
        <Text style={styles.cardSub}>
          Project slug + deploy version are read at runtime from <Text style={styles.mono}>ROBOFLOW_PROJECT_*</Text> and{' '}
          <Text style={styles.mono}>ROBOFLOW_VERSION_*</Text>. Restart Metro with{' '}
          <Text style={styles.mono}>--reset-cache</Text> after changing them.
        </Text>
        {roboflowProjectOrder.map((key, i) => (
          <View key={key} style={[styles.deployRow, i > 0 && styles.tableRowBorder]}>
            <Text style={styles.mono}>{key}</Text>
            <Text style={styles.monoSmall} numberOfLines={2}>
              {roboflowDeploy[key].projectId} · v{roboflowDeploy[key].version}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Roboflow class → spec violation</Text>
        <Text style={styles.cardSub}>
          Labels must match your deployed models. Spec ids are used on challans and in Firestore.
        </Text>
        {ROBOFLOW_CLASS_SPEC_SHEET.map((row, i) => (
          <View key={`${row.roboflowClass}-${i}`} style={[styles.tableRow, i > 0 && styles.tableRowBorder]}>
            <Text style={styles.mono}>{row.roboflowClass}</Text>
            <Text style={styles.badge}>{row.role}</Text>
            <Text style={styles.specId}>{row.specViolationId ?? '—'}</Text>
            <Text style={styles.note}>{row.note}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Plate normalization</Text>
        <Text style={styles.body}>{PLATE_NORMALIZATION_RULES_SUMMARY}</Text>
        <View style={styles.exampleBox}>
          <Text style={styles.exampleLabel}>Example input</Text>
          <Text style={styles.mono}>{JSON.stringify(plateExample)}</Text>
          <Text style={styles.exampleLabel}>Display</Text>
          <Text style={styles.mono}>{JSON.stringify(display)}</Text>
          <Text style={styles.exampleLabel}>Canonical</Text>
          <Text style={styles.mono}>{JSON.stringify(canonical)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Challan PDF fields (template)</Text>
        <Text style={styles.cardSub}>Ordered list for binding when PDF generation is implemented.</Text>
        {CHALLAN_PDF_FIELDS.map((f, i) => (
          <View key={f.key} style={[styles.pdfRow, i > 0 && styles.tableRowBorder]}>
            <Text style={styles.pdfKey}>{f.key}</Text>
            <Text style={styles.pdfLabel}>{f.label}</Text>
            <Text style={styles.pdfSource}>{f.source}</Text>
            {f.notes ? <Text style={styles.note}>{f.notes}</Text> : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 14, gap: 14, paddingBottom: 32 },
  card: {
    backgroundColor: SURFACE_PANEL,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  cardSub: { fontSize: 12, color: TEXT_MUTED, marginBottom: 4 },
  body: { fontSize: 13, color: TEXT_SECONDARY, lineHeight: 20 },
  tableRow: { gap: 6, paddingVertical: 8 },
  tableRowBorder: { borderTopWidth: 1, borderTopColor: SURFACE_PANEL_BORDER },
  mono: { fontSize: 12, fontFamily: 'monospace', color: TEXT_PRIMARY },
  monoSmall: { fontSize: 11, fontFamily: 'monospace', color: TEXT_SECONDARY, lineHeight: 17 },
  badge: { fontSize: 11, color: BRAND_ACCENT, fontWeight: '600' },
  specId: { fontSize: 12, color: BRAND_ACCENT, fontFamily: 'monospace' },
  note: { fontSize: 11, color: TEXT_SECONDARY, lineHeight: 16 },
  exampleBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    gap: 4,
    marginTop: 4,
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
  },
  exampleLabel: { fontSize: 11, fontWeight: '600', color: TEXT_MUTED },
  pdfRow: { gap: 4, paddingVertical: 8 },
  pdfKey: { fontSize: 12, fontFamily: 'monospace', color: TEXT_PRIMARY },
  pdfLabel: { fontSize: 13, color: TEXT_SECONDARY },
  pdfSource: { fontSize: 11, color: BRAND_ACCENT },
  ruleTitle: { fontSize: 13, fontWeight: '700', color: TEXT_PRIMARY },
  deployRow: { gap: 4, paddingVertical: 8 },
});
