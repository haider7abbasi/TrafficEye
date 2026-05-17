import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useApp } from '../context/AppContext';
import type { BottomTabParamList } from '../navigation/BottomTabNavigator';
import { Calendar, Car, ClipboardList, MapPin, Trash2 } from 'lucide-react-native';
import {
  BRAND_ACCENT,
  SURFACE_PANEL,
  SURFACE_PANEL_BORDER,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '../theme/brandColors';

export function HistoryScreen() {
  const { records, deleteRecord } = useApp();
  const tabNav = useNavigation<BottomTabNavigationProp<BottomTabParamList, 'History'>>();

  if (records.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIconWrap}>
          <ClipboardList size={48} color={TEXT_MUTED} strokeWidth={1.75} />
        </View>
        <Text style={styles.emptyTitle}>No saved scans yet</Text>
        <Text style={styles.emptyDesc}>
          Open the Scan tab, run detection on a photo or video, then tap Save on the result screen. Your saved items
          appear here.
        </Text>
        <Pressable
          style={styles.emptyCta}
          onPress={() => tabNav.navigate('Capture')}
          accessibilityRole="button"
          accessibilityLabel="Go to scan tab">
          <Text style={styles.emptyCtaText}>Go to Scan</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.listTitle}>Violation history ({records.length})</Text>
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
                <MapPin size={15} color={TEXT_MUTED} strokeWidth={2} />
                <Text style={styles.detailText}>{item.location}</Text>
              </View>
              <View style={styles.detailRow}>
                <Calendar size={15} color={TEXT_MUTED} strokeWidth={2} />
                <Text style={styles.detailText}>
                  {new Date(item.timestamp).toLocaleDateString()} at{' '}
                  {new Date(item.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              {item.vehicleNumber && (
                <View style={styles.detailRow}>
                  <Car size={15} color={TEXT_MUTED} strokeWidth={2} />
                  <Text style={styles.detailText}>Vehicle: {item.vehicleNumber}</Text>
                </View>
              )}
              <Text style={styles.confidence}>Confidence: {item.confidence}%</Text>

              <Pressable style={styles.deleteBtn} onPress={() => deleteRecord(item.id)}>
                <Trash2 size={16} color="#dc2626" strokeWidth={2} />
                <Text style={styles.deleteBtnText}>Delete record</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 14, gap: 14, paddingBottom: 30 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIconWrap: { marginBottom: 12, opacity: 0.9 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY, marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: TEXT_SECONDARY, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  emptyCta: {
    marginTop: 20,
    backgroundColor: BRAND_ACCENT,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  emptyCtaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  listTitle: { fontSize: 17, fontWeight: '700', color: TEXT_PRIMARY },
  card: {
    backgroundColor: SURFACE_PANEL,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
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
    borderColor: '#DCEEFF',
    backgroundColor: '#EAF4FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  clearTagText: { color: '#2E7D32', fontSize: 11, fontWeight: '600' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, color: TEXT_SECONDARY, flex: 1 },
  confidence: { fontSize: 11, color: TEXT_MUTED },
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
  deleteBtnText: { color: '#dc2626', fontWeight: '500', fontSize: 13 },
});
