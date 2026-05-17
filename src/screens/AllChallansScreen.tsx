import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { ScreenLoadingCenter } from '../components/TrafficEyeLoader';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { CHALLANS_COLLECTION } from '../config/collections';
import { useApp } from '../context/AppContext';

type ChallanItem = {
  id: string;
  officerId: string;
  confirmedAt: string;
  plate: string;
  violationTypes: string[];
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

export function AllChallansScreen() {
  const { user } = useApp();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ChallanItem[]>([]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      setLoading(false);
      setItems([]);
      return;
    }

    const unsub = firestore()
      .collection(CHALLANS_COLLECTION)
      .orderBy('confirmedAt', 'desc')
      .limit(200)
      .onSnapshot(
        snap => {
          const next: ChallanItem[] = [];
          snap.forEach(doc => {
            const data = doc.data() as Record<string, unknown>;
            next.push({
              id: doc.id,
              officerId: String(data.confirmationOfficerId ?? data.officerId ?? 'unknown'),
              confirmedAt: toIso(data.confirmedAt as FirebaseFirestoreTypes.Timestamp | string | undefined),
              plate: String(data.vehiclePlateDisplay ?? data.vehiclePlateCanonical ?? ''),
              violationTypes: Array.isArray(data.violationTypes)
                ? data.violationTypes.map(v => String(v))
                : [],
            });
          });
          setItems(next);
          setLoading(false);
        },
        err => {
          console.warn('[All challans]', err.message);
          setLoading(false);
        },
      );

    return unsub;
  }, [user?.role]);

  if (user?.role !== 'admin') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Admin Only</Text>
        <Text style={styles.subtle}>You do not have permission to access all challans.</Text>
      </View>
    );
  }

  if (loading) {
    return <ScreenLoadingCenter message="Loading challans…" />;
  }

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>All Challans</Text>
      <Text style={styles.subtle}>System-wide confirmed challans: {items.length}</Text>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingTop: 10, gap: 10, paddingBottom: 20 }}
        ListEmptyComponent={<Text style={styles.empty}>No challans found.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.violationTypes.join(', ') || 'Unspecified violation'}</Text>
            <Text style={styles.meta}>Plate: {item.plate || 'N/A'}</Text>
            <Text style={styles.meta}>Officer: {item.officerId}</Text>
            <Text style={styles.meta}>
              Confirmed: {new Date(item.confirmedAt).toLocaleDateString()}{' '}
              {new Date(item.confirmedAt).toLocaleTimeString()}
            </Text>
            <Text style={styles.id}>ID: {item.id}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent', padding: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  heading: { fontSize: 20, fontWeight: '800', color: '#111827' },
  title: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 },
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
  meta: { fontSize: 12, color: '#4b5563' },
  id: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
});
