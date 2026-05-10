import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
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

export function DetectionRulesScreen() {
  const plateExample = ' ab-12 c  ';
  const display = normalizePlateForDisplay(plateExample);
  const canonical = normalizePlateCanonical(plateExample);
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
        <Text style={styles.cardTitle}>Traffic rules (live from Firestore)</Text>
        <Text style={styles.cardSub}>Collection: {TRAFFIC_RULES_COLLECTION}</Text>
        {loadingRules ? (
          <ActivityIndicator color="#2563eb" />
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
        <Text style={styles.cardSub}>Firestore collection ids (§4 blueprint)</Text>
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
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 14, gap: 14, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  body: { fontSize: 13, color: '#6b7280', lineHeight: 20 },
  tableRow: { gap: 6, paddingVertical: 8 },
  tableRowBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  mono: { fontSize: 12, fontFamily: 'monospace', color: '#111827' },
  monoSmall: { fontSize: 11, fontFamily: 'monospace', color: '#374151', lineHeight: 17 },
  badge: { fontSize: 11, color: '#2563eb', fontWeight: '600' },
  specId: { fontSize: 12, color: '#059669', fontFamily: 'monospace' },
  note: { fontSize: 11, color: '#6b7280', lineHeight: 16 },
  exampleBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    gap: 4,
    marginTop: 4,
  },
  exampleLabel: { fontSize: 11, fontWeight: '600', color: '#9ca3af' },
  pdfRow: { gap: 4, paddingVertical: 8 },
  pdfKey: { fontSize: 12, fontFamily: 'monospace', color: '#111827' },
  pdfLabel: { fontSize: 13, color: '#374151' },
  pdfSource: { fontSize: 11, color: '#2563eb' },
  ruleTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
});
