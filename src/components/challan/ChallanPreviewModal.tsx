import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BadgeCheck,
  Calendar,
  Car,
  Download,
  Eye,
  FileText,
  MapPin,
  User,
  X,
} from 'lucide-react-native';
import type { ChallanRecord } from '../../types/challanRecord';
import { formatChallanDate } from '../../services/challanDisplay';
import { getStorageDownloadUrl } from '../../services/storageEvidence';
import {
  BG_LIGHT_BLUE,
  BG_SECONDARY_BLUE,
  ON_PRIMARY_MUTED,
  PRIMARY_BLUE,
  SUCCESS_GREEN,
  SURFACE_PANEL,
  SURFACE_PANEL_BORDER,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  WHITE,
} from '../../theme/brandColors';

type Props = {
  visible: boolean;
  challan: ChallanRecord | null;
  downloading?: boolean;
  onClose: () => void;
  onDownloadPdf: () => void;
};

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      {icon}
      <View style={styles.detailTextCol}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

export function ChallanPreviewModal({
  visible,
  challan,
  downloading = false,
  onClose,
  onDownloadPdf,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  useEffect(() => {
    if (!visible || !challan?.evidenceImageRef) {
      setEvidenceUrl(null);
      return;
    }
    let cancelled = false;
    setEvidenceLoading(true);
    void getStorageDownloadUrl(challan.evidenceImageRef)
      .then(url => {
        if (!cancelled) {
          setEvidenceUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEvidenceUrl(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setEvidenceLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [visible, challan?.evidenceImageRef]);

  if (!challan) {
    return null;
  }

  const imageHeight = Math.min(220, width * 0.55);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <View style={styles.headerTitleRow}>
              <Eye size={20} color={WHITE} strokeWidth={2.2} />
              <Text style={styles.title}>Challan preview</Text>
            </View>
            <Text style={styles.subtitle}>{challan.id}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close preview">
            <X size={24} color={WHITE} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.statusBanner}>
            <BadgeCheck size={22} color={SUCCESS_GREEN} strokeWidth={2.2} />
            <View style={styles.statusTextCol}>
              <Text style={styles.statusTitle}>Confirmed challan</Text>
              <Text style={styles.statusSub}>{challan.status}</Text>
            </View>
          </View>

          {evidenceLoading ? (
            <View style={[styles.evidenceCard, { height: imageHeight }]}>
              <ActivityIndicator size="large" color={PRIMARY_BLUE} />
            </View>
          ) : evidenceUrl ? (
            <View style={styles.evidenceCard}>
              <Image
                source={{ uri: evidenceUrl }}
                style={[styles.evidenceImage, { height: imageHeight }]}
                resizeMode="contain"
              />
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Violation details</Text>
            <View style={styles.tagsWrap}>
              {challan.violationLabels.map((label, i) => (
                <View key={`${label}-${i}`} style={styles.tag}>
                  <Text style={styles.tagText}>{label}</Text>
                </View>
              ))}
            </View>

            <DetailRow
              icon={<Car size={18} color={TEXT_MUTED} strokeWidth={2} />}
              label="Registration plate"
              value={`${challan.plateDisplay || '—'} (${challan.plateCanonical || '—'})`}
            />
            <DetailRow
              icon={<MapPin size={18} color={TEXT_MUTED} strokeWidth={2} />}
              label="Location"
              value={challan.locationText || '—'}
            />
            <DetailRow
              icon={<Calendar size={18} color={TEXT_MUTED} strokeWidth={2} />}
              label="Issued"
              value={formatChallanDate(challan.confirmedAt)}
            />
            <DetailRow
              icon={<Calendar size={18} color={TEXT_MUTED} strokeWidth={2} />}
              label="Expires"
              value={formatChallanDate(challan.expiresAt)}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Issuing officer</Text>
            <DetailRow
              icon={<User size={18} color={TEXT_MUTED} strokeWidth={2} />}
              label="Name"
              value={challan.officerName}
            />
            <DetailRow
              icon={<BadgeCheck size={18} color={TEXT_MUTED} strokeWidth={2} />}
              label="Badge"
              value={challan.officerBadge}
            />
            <DetailRow
              icon={<FileText size={18} color={TEXT_MUTED} strokeWidth={2} />}
              label="Department"
              value={challan.officerDepartment}
            />
          </View>

          <View style={styles.pdfPreviewCard}>
            <FileText size={20} color={PRIMARY_BLUE} strokeWidth={2.2} />
            <Text style={styles.pdfPreviewTitle}>PDF document</Text>
            <Text style={styles.pdfPreviewBody}>
              Download the official TrafficEye challan PDF with reference, plate, violations, officer details, and
              timestamps.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.btnDownload, (pressed || downloading) && styles.btnPressed]}
            onPress={onDownloadPdf}
            disabled={downloading}
            accessibilityRole="button"
            accessibilityLabel="Download challan PDF">
            {downloading ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <Download size={20} color={WHITE} strokeWidth={2.2} />
            )}
            <Text style={styles.btnDownloadText}>{downloading ? 'Preparing PDF…' : 'Download PDF'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(8, 18, 40, 0.98)' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  headerText: { flex: 1, gap: 4 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '800', color: WHITE },
  subtitle: { fontSize: 13, color: ON_PRIMARY_MUTED, fontWeight: '600' },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  statusTextCol: { flex: 1, gap: 2 },
  statusTitle: { fontSize: 15, fontWeight: '800', color: SUCCESS_GREEN },
  statusSub: { fontSize: 12, color: TEXT_SECONDARY, textTransform: 'capitalize' },
  evidenceCard: {
    backgroundColor: SURFACE_PANEL,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceImage: { width: '100%', backgroundColor: '#0f172a' },
  card: {
    backgroundColor: SURFACE_PANEL,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
    padding: 14,
    gap: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  detailTextCol: { flex: 1, gap: 2 },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: { fontSize: 14, color: TEXT_SECONDARY, lineHeight: 20, fontWeight: '600' },
  pdfPreviewCard: {
    backgroundColor: BG_LIGHT_BLUE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BG_SECONDARY_BLUE,
    padding: 14,
    gap: 8,
  },
  pdfPreviewTitle: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY },
  pdfPreviewBody: { fontSize: 13, color: TEXT_SECONDARY, lineHeight: 19 },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
  btnDownload: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: PRIMARY_BLUE,
  },
  btnDownloadText: { color: WHITE, fontSize: 16, fontWeight: '800' },
  btnPressed: { opacity: 0.9 },
});
