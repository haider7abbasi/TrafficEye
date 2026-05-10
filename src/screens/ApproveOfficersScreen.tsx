import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useApp } from '../context/AppContext';
import { USERS_COLLECTION } from '../config/collections';

type PendingOfficer = {
  id: string;
  name: string;
  email: string;
  department: string;
};

export function ApproveOfficersScreen() {
  const { user } = useApp();
  const [items, setItems] = useState<PendingOfficer[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      setLoading(false);
      setItems([]);
      return;
    }
    const unsub = firestore()
      .collection(USERS_COLLECTION)
      .where('role', '==', 'officer')
      .where('approved', '==', false)
      .onSnapshot(
        snap => {
          const list: PendingOfficer[] = [];
          snap.forEach(doc => {
            const data = doc.data();
            list.push({
              id: doc.id,
              name: String(data.name ?? 'Officer'),
              email: String(data.email ?? ''),
              department: String(data.department ?? ''),
            });
          });
          setItems(list);
          setLoading(false);
        },
        () => setLoading(false),
      );
    return unsub;
  }, [user?.role]);

  const approveOfficer = async (id: string) => {
    setApprovingId(id);
    try {
      await firestore().collection(USERS_COLLECTION).doc(id).set({ approved: true }, { merge: true });
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'Failed to approve officer.';
      console.warn('[Approve officer]', message);
      Alert.alert('Approval failed', message);
    } finally {
      setApprovingId(null);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Admin Only</Text>
        <Text style={styles.subtle}>You do not have permission to access this page.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Approve Officers</Text>
      <Text style={styles.subtle}>Pending accounts: {items.length}</Text>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingTop: 10, gap: 10, paddingBottom: 20 }}
        ListEmptyComponent={<Text style={styles.empty}>No pending officer approvals.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <Text style={styles.dept}>{item.department || 'Traffic Enforcement'}</Text>
            <Pressable
              style={[styles.approveBtn, approvingId === item.id && styles.approveBtnDisabled]}
              disabled={approvingId === item.id}
              onPress={() => approveOfficer(item.id)}>
              <Text style={styles.approveText}>
                {approvingId === item.id ? 'Approving...' : 'Approve'}
              </Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6', padding: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
  heading: { fontSize: 20, fontWeight: '800', color: '#111827' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  subtle: { color: '#6b7280', marginTop: 2 },
  empty: { marginTop: 16, color: '#6b7280' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4,
  },
  name: { fontSize: 16, fontWeight: '700', color: '#111827' },
  email: { fontSize: 13, color: '#374151' },
  dept: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  approveBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  approveBtnDisabled: { opacity: 0.7 },
  approveText: { color: '#fff', fontWeight: '700' },
});
