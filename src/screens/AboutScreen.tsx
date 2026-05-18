import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import {
  BarChart3,
  Bot,
  Camera,
  Info,
  Lock,
} from 'lucide-react-native';
import { TrafficEyeLogo } from '../components/TrafficEyeLogo';
import { BRAND_ACCENT, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY } from '../theme/brandColors';

const ICON = 20;
const ICON_MUTED = '#64748b';

const FEATURES: { title: string; desc: string; Icon: typeof Camera }[] = [
  { Icon: Bot, title: 'Assisted detection', desc: 'Models highlight likely violations for officer review.' },
  { Icon: Camera, title: 'Capture & review', desc: 'Photos, gallery, and controlled live sampling in one flow.' },
  { Icon: BarChart3, title: 'History', desc: 'Saved scans and outcomes stay on this device until synced by policy.' },
  { Icon: Lock, title: 'Account access', desc: 'Sign-in and roles are managed by your Firebase administrator.' },
];

export function AboutScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <TrafficEyeLogo size={72} style={styles.heroIcon} />
        <Text style={styles.heroTitle}>TrafficEye</Text>
        <Text style={styles.heroSub}>Road safety capture and review</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Info size={ICON} color={BRAND_ACCENT} strokeWidth={2.2} />
          <Text style={styles.cardTitle}>Purpose</Text>
        </View>
        <Text style={styles.body}>
          TrafficEye helps officers record scenes, run detection, queue candidates, and manage challans in line with
          your department&apos;s rules. All enforcement decisions stay with trained staff.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Capabilities</Text>
        {FEATURES.map(f => (
          <View key={f.title} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <f.Icon size={18} color={ICON_MUTED} strokeWidth={2} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Support</Text>
        <Text style={styles.body}>
          For access issues, approvals, or policy questions, contact your traffic command or IT administrator. This
          screen does not list external helpdesk numbers.
        </Text>
      </View>

      <Text style={styles.footer}>© 2026 TrafficEye</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  hero: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: BRAND_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: TEXT_PRIMARY },
  heroSub: { fontSize: 14, color: TEXT_SECONDARY, textAlign: 'center' },
  version: { fontSize: 12, color: TEXT_MUTED, marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: TEXT_PRIMARY },
  body: { fontSize: 14, color: TEXT_SECONDARY, lineHeight: 22 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureIcon: { width: 28, paddingTop: 2 },
  featureText: { flex: 1, gap: 2 },
  featureTitle: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY },
  featureDesc: { fontSize: 13, color: TEXT_MUTED, lineHeight: 19 },
  footer: { textAlign: 'center', fontSize: 12, color: TEXT_MUTED, marginTop: 4 },
});
