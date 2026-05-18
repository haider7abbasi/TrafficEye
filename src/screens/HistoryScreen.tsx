import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  FlatList,
  useWindowDimensions,
  type ListRenderItem,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, type ViolationRecord } from '../context/AppContext';
import type { HistoryStackParamList } from '../navigation/HistoryStackNavigator';
import { historyScrollContentPadding } from '../navigation/historyStackLayout';
import {
  HistoryFilterTabs,
  type HistoryFilterTab,
} from '../components/history/HistoryFilterTabs';
import {
  BadgeCheck,
  Calendar,
  Car,
  ChevronRight,
  ClipboardList,
  MapPin,
} from 'lucide-react-native';
import {
  PRIMARY_BLUE,
  SUCCESS_GREEN,
  SURFACE_PANEL,
  SURFACE_PANEL_BORDER,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '../theme/brandColors';

type Nav = NativeStackNavigationProp<HistoryStackParamList, 'HistoryList'>;

function isPendingViolation(record: ViolationRecord): boolean {
  return record.violations.length > 0 && !record.challanId;
}

function isIssuedChallan(record: ViolationRecord): boolean {
  return Boolean(record.challanId);
}

function HistoryCard({
  item,
  imageHeight,
  onPress,
  variant,
}: {
  item: ViolationRecord;
  imageHeight: number;
  onPress: () => void;
  variant: HistoryFilterTab;
}) {
  const hasViolations = item.violations.length > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open violation from ${new Date(item.timestamp).toLocaleString()}`}
      accessibilityHint="Opens record details and challan options">
      <View style={styles.imageWrap}>
        <Image source={{ uri: item.imageUri }} style={[styles.thumb, { height: imageHeight }]} resizeMode="cover" />
        {hasViolations ? (
          <View style={styles.badgeOverlay}>
            <Text style={styles.badgeOverlayText}>
              {item.violations.length} violation{item.violations.length > 1 ? 's' : ''}
            </Text>
          </View>
        ) : null}
        {item.challanId ? (
          <View style={styles.challanPill}>
            <BadgeCheck size={14} color={SUCCESS_GREEN} strokeWidth={2.2} />
            <Text style={styles.challanPillText}>Issued</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardBody}>
        {variant === 'issued' && item.challanId ? (
          <View style={styles.challanRefRow}>
            <BadgeCheck size={16} color={SUCCESS_GREEN} strokeWidth={2.2} />
            <Text style={styles.challanRefText} numberOfLines={1}>
              {item.challanId}
            </Text>
          </View>
        ) : null}

        {hasViolations ? (
          <View style={styles.tagsWrap}>
            {item.violations.slice(0, 3).map((v, i) => (
              <View key={`${v}-${i}`} style={styles.tag}>
                <Text style={styles.tagText} numberOfLines={1}>
                  {v}
                </Text>
              </View>
            ))}
            {item.violations.length > 3 ? (
              <Text style={styles.moreTags}>+{item.violations.length - 3}</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.clearTag}>
            <Text style={styles.clearTagText}>No violations</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <MapPin size={15} color={TEXT_MUTED} strokeWidth={2} />
          <Text style={styles.detailText} numberOfLines={1}>
            {item.location}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Calendar size={15} color={TEXT_MUTED} strokeWidth={2} />
          <Text style={styles.detailText} numberOfLines={1}>
            {new Date(item.timestamp).toLocaleDateString()} ·{' '}
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {item.vehicleNumber ? (
          <View style={styles.detailRow}>
            <Car size={15} color={TEXT_MUTED} strokeWidth={2} />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.vehicleNumber}
            </Text>
          </View>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={styles.tapHint}>
            {variant === 'issued'
              ? 'View details and challan'
              : hasViolations
                ? 'Review evidence and issue challan'
                : 'View record'}
          </Text>
          <ChevronRight size={18} color={PRIMARY_BLUE} strokeWidth={2.5} />
        </View>
      </View>
    </Pressable>
  );
}

function HistoryEmptyState({
  tab,
  paddingTop,
}: {
  tab: HistoryFilterTab;
  paddingTop: number;
}) {
  const isPending = tab === 'pending';
  return (
    <View style={[styles.emptyWrap, { paddingTop }]}>
      <View style={styles.emptyIconWrap}>
        {isPending ? (
          <ClipboardList size={48} color={TEXT_MUTED} strokeWidth={1.75} />
        ) : (
          <BadgeCheck size={48} color={TEXT_MUTED} strokeWidth={1.75} />
        )}
      </View>
      <Text style={styles.emptyTitle}>
        {isPending ? 'No pending violations' : 'No issued challans yet'}
      </Text>
      <Text style={styles.emptyDesc}>
        {isPending
          ? 'Saved violations awaiting challan issuance appear here. Capture and save from the home screen.'
          : 'After you issue a challan from a violation record, it will appear in this list.'}
      </Text>
    </View>
  );
}

export function HistoryScreen() {
  const { records } = useApp();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollPadding = historyScrollContentPadding(insets, width, { includeTopSafeArea: true });
  const imageHeight = Math.min(200, Math.max(140, width * 0.38));
  const [activeTab, setActiveTab] = useState<HistoryFilterTab>('pending');

  const pendingRecords = useMemo(
    () => records.filter(isPendingViolation).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [records],
  );
  const issuedRecords = useMemo(
    () => records.filter(isIssuedChallan).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [records],
  );

  const listData = activeTab === 'pending' ? pendingRecords : issuedRecords;

  const openDetail = useCallback(
    (recordId: string) => {
      navigation.navigate('ViolationDetail', { recordId });
    },
    [navigation],
  );

  const renderItem: ListRenderItem<ViolationRecord> = useCallback(
    ({ item }) => (
      <HistoryCard
        item={item}
        imageHeight={imageHeight}
        variant={activeTab}
        onPress={() => openDetail(item.id)}
      />
    ),
    [activeTab, imageHeight, openDetail],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <Text style={styles.listTitle}>History</Text>
        <HistoryFilterTabs
          active={activeTab}
          pendingCount={pendingRecords.length}
          issuedCount={issuedRecords.length}
          onChange={setActiveTab}
        />
      </View>
    ),
    [activeTab, issuedRecords.length, pendingRecords.length],
  );

  if (records.length === 0) {
    return (
      <View style={[styles.emptyWrap, { paddingTop: insets.top + 24 }]}>
        <View style={styles.emptyIconWrap}>
          <ClipboardList size={48} color={TEXT_MUTED} strokeWidth={1.75} />
        </View>
        <Text style={styles.emptyTitle}>No saved scans yet</Text>
        <Text style={styles.emptyDesc}>
          Capture violations from the home screen and save them. Saved records appear here for review and challan issuance.
        </Text>
      </View>
    );
  }

  if (listData.length === 0) {
    return (
      <View style={styles.screenRoot}>
        <View style={[styles.headerBlock, scrollPadding, styles.headerOnly]}>
          <Text style={styles.listTitle}>History</Text>
          <HistoryFilterTabs
            active={activeTab}
            pendingCount={pendingRecords.length}
            issuedCount={issuedRecords.length}
            onChange={setActiveTab}
          />
        </View>
        <HistoryEmptyState tab={activeTab} paddingTop={24} />
      </View>
    );
  }

  return (
    <FlatList
      data={listData}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      contentContainerStyle={[styles.listContent, scrollPadding]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={listHeader}
    />
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  headerBlock: { gap: 12, marginBottom: 4 },
  headerOnly: { paddingBottom: 0 },
  listContent: { gap: 14 },
  listTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: 0.2,
  },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIconWrap: { marginBottom: 12, opacity: 0.9 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY, marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: TEXT_SECONDARY, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
  card: {
    backgroundColor: SURFACE_PANEL,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
  },
  cardPressed: { opacity: 0.94, transform: [{ scale: 0.995 }] },
  imageWrap: { position: 'relative', backgroundColor: '#0f172a' },
  thumb: { width: '100%' },
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
  challanPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  challanPillText: { fontSize: 11, fontWeight: '800', color: SUCCESS_GREEN },
  cardBody: { padding: 14, gap: 8 },
  challanRefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  challanRefText: { flex: 1, fontSize: 12, fontWeight: '700', color: SUCCESS_GREEN },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  tag: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: '100%',
  },
  tagText: { color: '#dc2626', fontSize: 11, fontWeight: '600' },
  moreTags: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED },
  clearTag: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#DCEEFF',
    backgroundColor: '#EAF4FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  clearTagText: { color: '#2E7D32', fontSize: 11, fontWeight: '600' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, color: TEXT_SECONDARY, flex: 1 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: SURFACE_PANEL_BORDER,
  },
  tapHint: { fontSize: 13, fontWeight: '700', color: PRIMARY_BLUE, flex: 1 },
});
