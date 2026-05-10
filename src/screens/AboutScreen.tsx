import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';

export function AboutScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* App Info */}
      <View style={styles.appCard}>
        <View style={styles.appIconWrap}>
          <Text style={styles.appIcon}>🛡️</Text>
        </View>
        <Text style={styles.appTitle}>Traffic Violation</Text>
        <Text style={styles.appSubTitle}>Detection System</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
      </View>

      {/* About */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.titleIcon}>ℹ️</Text>
          <Text style={styles.cardTitle}>About This App</Text>
        </View>
        <Text style={styles.bodyText}>
          The Traffic Violation Detection System is an advanced mobile application designed to
          help law enforcement officers efficiently detect and record traffic violations using
          AI-powered image analysis.
        </Text>
        <Text style={styles.bodyText}>
          Our system uses cutting-edge computer vision technology to automatically identify
          various types of traffic violations from captured images, making enforcement faster
          and more accurate.
        </Text>
      </View>

      {/* Key Features */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Key Features</Text>
        {[
          { icon: '🤖', title: 'AI-Powered Detection', desc: 'Automatic violation identification' },
          { icon: '📷', title: 'Real-time Camera', desc: 'Capture violations instantly' },
          { icon: '📊', title: 'History & Analytics', desc: 'Track and analyze violations' },
          { icon: '🔒', title: 'Secure Storage', desc: 'All data encrypted and protected' },
        ].map(f => (
          <View key={f.title} style={styles.featureRow}>
            <View style={styles.featureDot} />
            <View>
              <Text style={styles.featureTitle}>{f.icon} {f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Contact */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.titleIcon}>✉️</Text>
          <View>
            <Text style={styles.cardTitle}>Contact & Support</Text>
            <Text style={styles.cardSub}>Get in touch with us</Text>
          </View>
        </View>
        {[
          { icon: '✉️', title: 'Email', value: 'support@trafficviolation.com' },
          { icon: '📞', title: 'Phone', value: '+1 (800) 123-4567' },
          { icon: '🌐', title: 'Website', value: 'www.trafficviolation.com' },
        ].map((item, i) => (
          <React.Fragment key={item.title}>
            {i > 0 && <View style={styles.separator} />}
            <View style={styles.contactRow}>
              <Text style={styles.contactIcon}>{item.icon}</Text>
              <View>
                <Text style={styles.contactTitle}>{item.title}</Text>
                <Text style={styles.contactValue}>{item.value}</Text>
              </View>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Team */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.titleIcon}>👥</Text>
          <Text style={styles.cardTitle}>Development Team</Text>
        </View>
        {[
          { role: 'Project Lead', name: 'John Doe' },
          { role: 'AI Engineer', name: 'Jane Smith' },
          { role: 'UI/UX Designer', name: 'Mike Johnson' },
        ].map((m, i) => (
          <React.Fragment key={m.role}>
            {i > 0 && <View style={styles.separator} />}
            <View style={styles.teamRow}>
              <Text style={styles.teamRole}>{m.role}</Text>
              <Text style={styles.teamName}>{m.name}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Legal */}
      <View style={styles.card}>
        {['Privacy Policy', 'Terms of Service', 'Licenses'].map(label => (
          <Pressable key={label} style={styles.legalBtn}>
            <Text style={styles.legalBtnTxt}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with ❤️ for safer roads</Text>
        <Text style={styles.footerCopy}>© 2026 Traffic Violation Detection System</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 14, gap: 14, paddingBottom: 30 },
  appCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  appIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  appIcon: { fontSize: 36 },
  appTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  appSubTitle: { fontSize: 15, color: '#6b7280' },
  appVersion: { fontSize: 12, color: '#9ca3af' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleIcon: { fontSize: 18 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 12, color: '#9ca3af' },
  bodyText: { fontSize: 13, color: '#6b7280', lineHeight: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginTop: 6,
  },
  featureTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  featureDesc: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  separator: { height: 1, backgroundColor: '#f3f4f6' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactIcon: { fontSize: 18 },
  contactTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  contactValue: { fontSize: 12, color: '#9ca3af' },
  teamRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamRole: { fontSize: 13, color: '#6b7280' },
  teamName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  legalBtn: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  legalBtnTxt: { fontSize: 14, color: '#374151', fontWeight: '500' },
  footer: { alignItems: 'center', paddingVertical: 8, gap: 4 },
  footerText: { fontSize: 13, color: '#9ca3af' },
  footerCopy: { fontSize: 11, color: '#d1d5db' },
});
