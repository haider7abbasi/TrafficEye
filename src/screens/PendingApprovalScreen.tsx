import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';

export function PendingApprovalScreen() {
  const { user, logout } = useApp();

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.icon}>⏳</Text>
        <Text style={styles.title}>Approval Pending</Text>
        <Text style={styles.message}>
          Your account has been created for {user?.email ?? 'this email'}.
          {'\n'}
          Please wait for admin approval before using the app.
        </Text>
        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  icon: { fontSize: 40 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  message: { color: '#4b5563', textAlign: 'center', lineHeight: 22 },
  logoutBtn: {
    marginTop: 8,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  logoutText: { color: '#fff', fontWeight: '700' },
});
