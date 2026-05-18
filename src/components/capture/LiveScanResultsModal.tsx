import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AlertTriangle, CheckCircle2, MinusCircle, X } from 'lucide-react-native';
import type { LiveScanFrameEntry, LiveScanReport } from '../../types/liveScanReport';
import {
  ACCENT_BLUE,
  ALERT_RED,
  BG_LIGHT_BLUE,
  BG_SECONDARY_BLUE,
  PRIMARY_BLUE,
  SUCCESS_GREEN,
  SURFACE_PANEL,
  SURFACE_PANEL_BORDER,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TRAFFIC_GOLD,
  WHITE,
} from '../../theme/brandColors';

type Props = {
  visible: boolean;
  report: LiveScanReport | null;
  onClose: () => void;
  onViewQueue: () => void;
};

function outcomeIcon(entry: LiveScanFrameEntry) {
  if (entry.outcome === 'violation') {
    return <AlertTriangle size={18} color={ALERT_RED} strokeWidth={2.2} />;
  }
  if (entry.outcome === 'suppressed') {
    return <MinusCircle size={18} color={TEXT_MUTED} strokeWidth={2.2} />;
  }
  if (entry.outcome === 'error') {
    return <AlertTriangle size={18} color={TRAFFIC_GOLD} strokeWidth={2.2} />;
  }
  return <CheckCircle2 size={18} color={SUCCESS_GREEN} strokeWidth={2.2} />;
}

export function LiveScanResultsModal({ visible, report, onClose, onViewQueue }: Props) {
  if (!report) {
    return null;
  }

  const title = report.mode === 'video' ? 'Video scan complete' : 'Live scan complete';
  const durationSec = Math.max(
    1,
    Math.round((new Date(report.endedAt).getTime() - new Date(report.startedAt).getTime()) / 1000),
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTextCol}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>
                {report.totalFrames} frame{report.totalFrames === 1 ? '' : 's'} · ~{durationSec}s session
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close scan results">
              <X size={22} color={TEXT_MUTED} strokeWidth={2.2} />
            </Pressable>
          </View>

          <View style={styles.kpiRow}>
            <View style={styles.kpi}>
              <Text style={styles.kpiValue}>{report.totalFrames}</Text>
              <Text style={styles.kpiLabel}>Scanned</Text>
            </View>
            <View style={[styles.kpi, styles.kpiAlert]}>
              <Text style={[styles.kpiValue, styles.kpiValueAlert]}>{report.violationsSaved}</Text>
              <Text style={styles.kpiLabel}>Flagged</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiValue}>{report.clearFrames}</Text>
              <Text style={styles.kpiLabel}>Clear</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiValue}>{report.suppressedFrames}</Text>
              <Text style={styles.kpiLabel}>Deduped</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Frame-by-frame results</Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator>
            {report.entries.length === 0 ? (
              <Text style={styles.empty}>No frames were processed in this session.</Text>
            ) : (
              report.entries.map(entry => (
                <View key={`${entry.frameId}-${entry.timestamp}`} style={styles.row}>
                  <View style={styles.rowIcon}>{outcomeIcon(entry)}</View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {entry.frameId}
                    </Text>
                    <Text style={styles.rowSummary} numberOfLines={3}>
                      {entry.summary}
                    </Text>
                    {entry.violations.length > 0 ? (
                      <Text style={styles.rowViolations} numberOfLines={2}>
                        {entry.violations.join(' · ')}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.actions}>
            {report.violationsSaved > 0 ? (
              <Pressable
                style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
                onPress={onViewQueue}
                accessibilityRole="button"
                accessibilityLabel="View candidate queue">
                <Text style={styles.btnPrimaryText}>View queue ({report.violationsSaved})</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnPressed]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Done">
              <Text style={styles.btnSecondaryText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 31, 68, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: SURFACE_PANEL,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: SURFACE_PANEL_BORDER,
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  headerTextCol: { flex: 1, gap: 4 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BG_LIGHT_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  kpi: {
    flex: 1,
    backgroundColor: BG_LIGHT_BLUE,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BG_SECONDARY_BLUE,
  },
  kpiAlert: {
    backgroundColor: '#FDECEC',
    borderColor: '#FECACA',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: PRIMARY_BLUE,
  },
  kpiValueAlert: {
    color: ALERT_RED,
  },
  kpiLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  list: {
    maxHeight: 280,
    marginBottom: 14,
  },
  listContent: {
    gap: 8,
    paddingBottom: 4,
  },
  empty: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
    paddingVertical: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: BG_LIGHT_BLUE,
    borderWidth: 1,
    borderColor: BG_SECONDARY_BLUE,
  },
  rowIcon: {
    marginTop: 2,
  },
  rowBody: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT_BLUE,
  },
  rowSummary: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    lineHeight: 19,
  },
  rowViolations: {
    fontSize: 12,
    fontWeight: '700',
    color: ALERT_RED,
    marginTop: 2,
  },
  actions: {
    gap: 10,
  },
  btnPrimary: {
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  btnPrimaryText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '800',
  },
  btnSecondary: {
    backgroundColor: BG_LIGHT_BLUE,
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: BG_SECONDARY_BLUE,
  },
  btnSecondaryText: {
    color: ACCENT_BLUE,
    fontSize: 15,
    fontWeight: '700',
  },
  btnPressed: {
    opacity: 0.9,
  },
});
