import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Shield } from 'lucide-react-native';
import type { LegalDocument } from '../../content/legalDocuments';
import { BRAND_HEADER_BG, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY } from '../../theme/brandColors';

type Props = {
  document: LegalDocument;
};

export function LegalDocumentView({ document }: Props) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Shield color="#fff" size={28} strokeWidth={2.2} />
        </View>
        <Text style={styles.heroTitle}>{document.title}</Text>
        <Text style={styles.heroSub}>{document.subtitle}</Text>
        <Text style={styles.updated}>Last updated · {document.updated}</Text>
      </View>

      {document.sections.map(section => (
        <View key={section.title} style={styles.card}>
          <Text style={styles.cardTitle}>{section.title}</Text>
          {section.paragraphs.map((p, i) => (
            <Text key={`${section.title}-p-${i}`} style={styles.body}>
              {p}
            </Text>
          ))}
          {section.bullets?.map((b, i) => (
            <View key={`${section.title}-b-${i}`} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </View>
      ))}

      <Text style={styles.footer}>TrafficEye · For authorised enforcement use only</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  hero: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: BRAND_HEADER_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: TEXT_PRIMARY, textAlign: 'center' },
  heroSub: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center', lineHeight: 19 },
  updated: { fontSize: 11, color: TEXT_MUTED, marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY },
  body: { fontSize: 14, color: TEXT_SECONDARY, lineHeight: 22 },
  bulletRow: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  bulletDot: { fontSize: 14, lineHeight: 22, color: BRAND_HEADER_BG, fontWeight: '800' },
  bulletText: { flex: 1, fontSize: 14, color: TEXT_SECONDARY, lineHeight: 22 },
  footer: { textAlign: 'center', fontSize: 11, color: TEXT_MUTED, marginTop: 4 },
});
