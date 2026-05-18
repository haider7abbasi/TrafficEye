import React from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { TrafficEyeLogo } from '../components/TrafficEyeLogo';
import {
  BG_LIGHT_BLUE,
  BRAND_HEADER_BG,
  SURFACE_PANEL,
  SURFACE_PANEL_BORDER,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TRAFFIC_GOLD,
} from '../theme/brandColors';

export function PendingApprovalScreen() {
  const { user, logout } = useApp();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND_HEADER_BG} />
      <View style={styles.inner}>
        <View style={styles.card}>
          <View style={styles.iconWrap} accessibilityLabel="Pending approval">
            <TrafficEyeLogo size={40} />
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>Pending administrator review</Text>
          </View>
          <Text style={styles.title}>Access not yet active</Text>
          <Text style={styles.message}>
            We created an account for <Text style={styles.emailEmphasis}>{user?.email ?? 'this email'}</Text>.
            {'\n\n'}
            An administrator must approve your officer profile before you can scan or upload evidence. If this
            takes more than a day, contact your supervisor.
          </Text>
          <Pressable
            style={styles.logoutBtn}
            onPress={logout}
            accessibilityRole="button"
            accessibilityLabel="Log out and use a different account">
            <Text style={styles.logoutText}>Use a different account</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: SURFACE_PANEL,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BG_LIGHT_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statusPill: {
    backgroundColor: 'rgba(244, 180, 0, 0.15)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: TRAFFIC_GOLD,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A6D00',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: { fontSize: 22, fontWeight: '800', color: TEXT_PRIMARY, textAlign: 'center' },
  message: { color: TEXT_SECONDARY, textAlign: 'center', lineHeight: 22, fontSize: 15 },
  emailEmphasis: { fontWeight: '700', color: TEXT_PRIMARY },
  logoutBtn: {
    marginTop: 8,
    backgroundColor: BRAND_HEADER_BG,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 200,
    alignItems: 'center',
  },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
