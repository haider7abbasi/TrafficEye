import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
} from 'react-native';
import { useApp } from '../context/AppContext';

export function HistoryScreen() {
  const { records, deleteRecord } = useApp();

  if (records.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>No Records Yet</Text>
        <Text style={styles.emptyDesc}>Captured violations will appear here.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.listTitle}>Violation History ({records.length})</Text>
      {records.map(item => {
        const hasViolations = item.violations.length > 0;
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.imageWrap}>
              <Image source={{ uri: item.imageUri }} style={styles.thumb} resizeMode="cover" />
              {hasViolations && (
                <View style={styles.badgeOverlay}>
                  <Text style={styles.badgeOverlayText}>
                    {item.violations.length} Violation{item.violations.length > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.cardBody}>
              {hasViolations ? (
                <View style={styles.tagsWrap}>
                  {item.violations.map((v, i) => (
                    <View key={i} style={styles.tag}>
                      <Text style={styles.tagText}>{v}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.clearTag}>
                  <Text style={styles.clearTagText}>No Violations</Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📍</Text>
                <Text style={styles.detailText}>{item.location}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📅</Text>
                <Text style={styles.detailText}>
                  {new Date(item.timestamp).toLocaleDateString()} at{' '}
                  {new Date(item.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              {item.vehicleNumber && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>🚗</Text>
                  <Text style={styles.detailText}>Vehicle: {item.vehicleNumber}</Text>
                </View>
              )}
              <Text style={styles.confidence}>Confidence: {item.confidence}%</Text>

              <Pressable style={styles.deleteBtn} onPress={() => deleteRecord(item.id)}>
                <Text style={styles.deleteIcon}>🗑</Text>
                <Text style={styles.deleteBtnText}>Delete Record</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 14, gap: 14, paddingBottom: 30 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  listTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  imageWrap: { position: 'relative' },
  thumb: { width: '100%', height: 180 },
  badgeOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#dc2626',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeOverlayText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  cardBody: { padding: 14, gap: 8 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { color: '#dc2626', fontSize: 11, fontWeight: '500' },
  clearTag: {
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  clearTagText: { color: '#16a34a', fontSize: 11, fontWeight: '500' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailIcon: { fontSize: 13 },
  detailText: { fontSize: 13, color: '#6b7280', flex: 1 },
  confidence: { fontSize: 11, color: '#9ca3af' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
    marginTop: 4,
  },
  deleteIcon: { fontSize: 14 },
  deleteBtnText: { color: '#dc2626', fontWeight: '500', fontSize: 13 },
});
