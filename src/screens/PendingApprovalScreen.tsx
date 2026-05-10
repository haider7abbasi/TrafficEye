import React from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';

export function PendingApprovalScreen() {
  const { user, logout } = useApp();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      <View style={styles.inner}>
        <View style={styles.card}>
          <Text style={styles.icon}>⏳</Text>
          <Text style={styles.title}>Waiting for approval</Text>
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
    backgroundColor: '#2563eb',
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  icon: { fontSize: 40 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  message: { color: '#4b5563', textAlign: 'center', lineHeight: 22, fontSize: 15 },
  emailEmphasis: { fontWeight: '700', color: '#111827' },
  logoutBtn: {
    marginTop: 8,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 200,
    alignItems: 'center',
  },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
