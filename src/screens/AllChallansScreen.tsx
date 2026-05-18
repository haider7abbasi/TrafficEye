import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  useWindowDimensions,
  type ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import {
  BadgeCheck,
  Calendar,
  Car,
  ChevronRight,
  Eye,
  FileStack,
  MapPin,
  Search,
  ShieldAlert,
} from 'lucide-react-native';
import { ScreenLoadingCenter } from '../components/TrafficEyeLoader';
import { ChallanPreviewModal } from '../components/challan/ChallanPreviewModal';
import { CHALLANS_COLLECTION } from '../config/collections';
import { useApp } from '../context/AppContext';
import { useLoading } from '../context/LoadingContext';
import { formatChallanDate } from '../services/challanDisplay';
import { downloadChallanPdf } from '../services/challanPdfDownload';
import { enrichChallanRecords, mapFirestoreChallanDoc } from '../services/challanRecordMapper';
import { appAlert } from '../services/appAlert';
import type { ChallanRecord } from '../types/challanRecord';
import {
  BG_LIGHT_BLUE,
  BG_SECONDARY_BLUE,
  PRIMARY_BLUE,
  SUCCESS_GREEN,
  SURFACE_PANEL,
  SURFACE_PANEL_BORDER,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  WHITE,
} from '../theme/brandColors';

function ChallanListCard({
  item,
  onPress,
}: {
  item: ChallanRecord;
  onPress: () => void;
}) {
  const primaryViolation = item.violationLabels[0] ?? 'Violation';
  const moreCount = item.violationLabels.length > 1 ? item.violationLabels.length - 1 : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Preview challan ${item.id}`}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleCol}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {primaryViolation}
            {moreCount > 0 ? ` +${moreCount}` : ''}
          </Text>
          <Text style={styles.cardRef} numberOfLines={1}>
            {item.id}
          </Text>
        </View>
        <View style={styles.issuedPill}>
          <BadgeCheck size={14} color={SUCCESS_GREEN} strokeWidth={2.2} />
          <Text style={styles.issuedPillText}>Issued</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Car size={15} color={TEXT_MUTED} strokeWidth={2} />
        <Text style={styles.metaText} numberOfLines={1}>
          {item.plateDisplay || item.plateCanonical || 'Plate not recorded'}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <MapPin size={15} color={TEXT_MUTED} strokeWidth={2} />
        <Text style={styles.metaText} numberOfLines={1}>
          {item.locationText || 'Location not recorded'}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <Calendar size={15} color={TEXT_MUTED} strokeWidth={2} />
        <Text style={styles.metaText} numberOfLines={1}>
          {formatChallanDate(item.confirmedAt)}
        </Text>
      </View>
      <Text style={styles.officerText} numberOfLines={1}>
        Officer: {item.officerName} · {item.officerBadge}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.previewHint}>
          <Eye size={16} color={PRIMARY_BLUE} strokeWidth={2.2} />
          <Text style={styles.previewHintText}>Preview & download PDF</Text>
        </View>
        <ChevronRight size={18} color={PRIMARY_BLUE} strokeWidth={2.5} />
      </View>
    </Pressable>
  );
}

export function AllChallansScreen() {
  const { user } = useApp();
  const { runWithLoading } = useLoading();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontalPad = width > 500 ? 24 : 14;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ChallanRecord[]>([]);
  const [search, setSearch] = useState('');
  const [previewChallan, setPreviewChallan] = useState<ChallanRecord | null>(null);
  const [downloading, setDownloading] = useState(false);

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
          const mapped = snap.docs
            .map(doc => mapFirestoreChallanDoc(doc))
            .filter((r): r is ChallanRecord => r != null);
          void enrichChallanRecords(mapped).then(enriched => {
            setItems(enriched);
            setLoading(false);
          });
        },
        err => {
          console.warn('[All challans]', err.message);
          setLoading(false);
        },
      );

    return unsub;
  }, [user?.role]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter(
      item =>
        item.id.toLowerCase().includes(q) ||
        item.plateDisplay.toLowerCase().includes(q) ||
        item.plateCanonical.toLowerCase().includes(q) ||
        item.officerName.toLowerCase().includes(q) ||
        item.locationText.toLowerCase().includes(q) ||
        item.violationLabels.some(v => v.toLowerCase().includes(q)),
    );
  }, [items, search]);

  const openPreview = useCallback((challan: ChallanRecord) => {
    setPreviewChallan(challan);
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    if (!previewChallan || downloading) {
      if (__DEV__) {
        console.log('[ChallanPDF]', 'ui:downloadSkipped', {
          hasChallan: Boolean(previewChallan),
          downloading,
        });
      }
      return;
    }
    if (__DEV__) {
      console.log('[ChallanPDF]', 'ui:downloadPressed', {
        challanId: previewChallan.id,
        challanPdfRef: previewChallan.challanPdfRef ?? null,
      });
    }
    setDownloading(true);
    try {
      await runWithLoading(async () => {
        await downloadChallanPdf(previewChallan);
      }, 'Preparing PDF…');
      if (__DEV__) {
        console.log('[ChallanPDF]', 'ui:downloadSuccess', { challanId: previewChallan.id });
      }
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'Could not download the challan PDF.';
      if (__DEV__) {
        console.warn('[ChallanPDF]', 'ui:downloadError', { challanId: previewChallan.id, message });
      }
      if (!String(message).toLowerCase().includes('user did not share')) {
        appAlert('Download failed', message);
      }
    } finally {
      setDownloading(false);
    }
  }, [downloading, previewChallan, runWithLoading]);

  const renderItem: ListRenderItem<ChallanRecord> = useCallback(
    ({ item }) => <ChallanListCard item={item} onPress={() => openPreview(item)} />,
    [openPreview],
  );

  if (user?.role !== 'admin') {
    return (
      <View style={[styles.guardWrap, { paddingTop: insets.top + 24 }]}>
        <ShieldAlert size={48} color={TEXT_MUTED} strokeWidth={1.75} />
        <Text style={styles.guardTitle}>Admin access required</Text>
        <Text style={styles.guardDesc}>You do not have permission to view all challans.</Text>
      </View>
    );
  }

  if (loading) {
    return <ScreenLoadingCenter message="Loading challans…" />;
  }

  const listHeader = (
    <View style={styles.headerBlock}>
      <View style={styles.titleRow}>
        <FileStack size={24} color={PRIMARY_BLUE} strokeWidth={2.2} />
        <View style={styles.titleCol}>
          <Text style={styles.heading}>All challans</Text>
          <Text style={styles.subheading}>System-wide confirmed challans</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{items.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{filtered.length}</Text>
          <Text style={styles.statLabel}>Showing</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <Search size={18} color={TEXT_MUTED} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search plate, reference, officer, location…"
          placeholderTextColor={TEXT_MUTED}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingHorizontal: horizontalPad,
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <FileStack size={40} color={TEXT_MUTED} strokeWidth={1.75} />
            <Text style={styles.emptyTitle}>{search.trim() ? 'No matches' : 'No challans yet'}</Text>
            <Text style={styles.emptyDesc}>
              {search.trim()
                ? 'Try a different plate, reference, or officer name.'
                : 'Confirmed challans from all officers will appear here.'}
            </Text>
          </View>
        }
      />

      <ChallanPreviewModal
        visible={previewChallan != null}
        challan={previewChallan}
        downloading={downloading}
        onClose={() => setPreviewChallan(null)}
        onDownloadPdf={() => void handleDownloadPdf()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  listContent: { gap: 12 },
  headerBlock: { gap: 14, marginBottom: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleCol: { flex: 1, gap: 2 },
  heading: { fontSize: 22, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: 0.2 },
  subheading: { fontSize: 13, color: TEXT_SECONDARY, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: SURFACE_PANEL,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: PRIMARY_BLUE },
  statLabel: { fontSize: 12, fontWeight: '700', color: TEXT_MUTED, textTransform: 'uppercase' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: SURFACE_PANEL,
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: TEXT_PRIMARY,
    paddingVertical: 10,
  },
  card: {
    backgroundColor: SURFACE_PANEL,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
    padding: 14,
    gap: 8,
  },
  cardPressed: { opacity: 0.94, transform: [{ scale: 0.995 }] },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitleCol: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY },
  cardRef: { fontSize: 11, color: TEXT_MUTED, fontWeight: '600' },
  issuedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  issuedPillText: { fontSize: 11, fontWeight: '800', color: SUCCESS_GREEN },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { flex: 1, fontSize: 13, color: TEXT_SECONDARY },
  officerText: { fontSize: 12, color: TEXT_MUTED, fontWeight: '600' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: SURFACE_PANEL_BORDER,
  },
  previewHint: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  previewHintText: { fontSize: 13, fontWeight: '700', color: PRIMARY_BLUE },
  emptyWrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: TEXT_PRIMARY },
  emptyDesc: { fontSize: 14, color: TEXT_SECONDARY, textAlign: 'center', lineHeight: 20 },
  guardWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 10,
    backgroundColor: 'transparent',
  },
  guardTitle: { fontSize: 18, fontWeight: '800', color: TEXT_PRIMARY },
  guardDesc: { fontSize: 14, color: TEXT_SECONDARY, textAlign: 'center', lineHeight: 20 },
});
