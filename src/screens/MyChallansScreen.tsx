import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { CHALLANS_COLLECTION } from '../config/collections';
import { useApp } from '../context/AppContext';

type ChallanItem = {
  id: string;
  confirmedAt: string;
  expiresAt?: string;
  plate: string;
  violationTypes: string[];
  status: string;
};

function toIso(ts: FirebaseFirestoreTypes.Timestamp | string | undefined): string {
  if (!ts) {
    return new Date(0).toISOString();
  }
  if (typeof ts === 'string') {
    return ts;
  }
  return ts.toDate().toISOString();
}

export function MyChallansScreen() {
  const { user } = useApp();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ChallanItem[]>([]);

  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) {
      setLoading(false);
      setItems([]);
      return;
    }

    const unsub = firestore()
      .collection(CHALLANS_COLLECTION)
      .where('officerId', '==', uid)
      .orderBy('confirmedAt', 'desc')
      .limit(200)
      .onSnapshot(
        snap => {
          const next: ChallanItem[] = [];
          snap.forEach(doc => {
            const data = doc.data() as Record<string, unknown>;
            next.push({
              id: doc.id,
              confirmedAt: toIso(data.confirmedAt as FirebaseFirestoreTypes.Timestamp | string | undefined),
              expiresAt: toIso(data.expiresAt as FirebaseFirestoreTypes.Timestamp | string | undefined),
              plate: String(data.vehiclePlateDisplay ?? data.vehiclePlateCanonical ?? ''),
              violationTypes: Array.isArray(data.violationTypes)
                ? data.violationTypes.map(v => String(v))
                : [],
              status: String(data.status ?? 'confirmed'),
            });
          });
          setItems(next);
          setLoading(false);
        },
        err => {
          console.warn('[My challans]', err.message);
          setLoading(false);
        },
      );
    return unsub;
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>
        {user?.role === 'admin' ? 'My Confirmed Challans (admin account)' : 'My Confirmed Challans'}
      </Text>
      <Text style={styles.subtle}>Total: {items.length}</Text>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingTop: 10, gap: 10, paddingBottom: 20 }}
        ListEmptyComponent={<Text style={styles.empty}>No confirmed challans yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.violationTypes.join(', ') || 'Unspecified violation'}</Text>
            <Text style={styles.meta}>Plate: {item.plate || 'N/A'}</Text>
            <Text style={styles.meta}>Status: {item.status}</Text>
            <Text style={styles.meta}>
              Confirmed: {new Date(item.confirmedAt).toLocaleDateString()}{' '}
              {new Date(item.confirmedAt).toLocaleTimeString()}
            </Text>
            {item.expiresAt ? (
              <Text style={styles.meta}>
                Expires: {new Date(item.expiresAt).toLocaleDateString()}{' '}
                {new Date(item.expiresAt).toLocaleTimeString()}
              </Text>
            ) : null}
            <Text style={styles.id}>ID: {item.id}</Text>
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
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 12, color: '#4b5563' },
  id: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
});
