import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BarChart3, ChevronRight } from 'lucide-react-native';
import type { LiveScanReport } from '../../types/liveScanReport';
import {
  ACCENT_BLUE,
  ALERT_RED,
  BG_LIGHT_BLUE,
  BG_SECONDARY_BLUE,
  PRIMARY_BLUE,
  SURFACE_PANEL,
  SURFACE_PANEL_BORDER,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '../../theme/brandColors';

type Props = {
  report: LiveScanReport;
  onViewDetails: () => void;
  onViewQueue?: () => void;
};

export function LiveScanReportSection({ report, onViewDetails, onViewQueue }: Props) {
  const label = report.mode === 'video' ? 'Last video scan' : 'Last live scan';
  const when = new Date(report.endedAt).toLocaleString();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <BarChart3 size={22} color={PRIMARY_BLUE} strokeWidth={2.2} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{label}</Text>
          <Text style={styles.when}>{when}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{report.totalFrames}</Text>
          <Text style={styles.statLabel}>Frames</Text>
        </View>
        <View style={[styles.stat, styles.statHighlight]}>
          <Text style={[styles.statValue, styles.statValueAlert]}>{report.violationsSaved}</Text>
          <Text style={styles.statLabel}>Flagged</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{report.clearFrames}</Text>
          <Text style={styles.statLabel}>Clear</Text>
        </View>
      </View>

      <Text style={styles.hint} numberOfLines={2}>
        {report.violationsSaved > 0
          ? `${report.violationsSaved} violation${report.violationsSaved === 1 ? '' : 's'} sent to the candidate queue.`
          : 'No violations were flagged in this session.'}
      </Text>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.btnOutline, pressed && styles.btnPressed]}
          onPress={onViewDetails}
          accessibilityRole="button"
          accessibilityLabel="View full scan results">
          <Text style={styles.btnOutlineText}>View full results</Text>
          <ChevronRight size={18} color={ACCENT_BLUE} strokeWidth={2.5} />
        </Pressable>
        {report.violationsSaved > 0 && onViewQueue ? (
          <Pressable
            style={({ pressed }) => [styles.btnSolid, pressed && styles.btnPressed]}
            onPress={onViewQueue}
            accessibilityRole="button"
            accessibilityLabel="Open candidate queue">
            <Text style={styles.btnSolidText}>Open queue</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACE_PANEL,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
    padding: 16,
    marginBottom: 14,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: BG_LIGHT_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  when: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: BG_LIGHT_BLUE,
    borderWidth: 1,
    borderColor: BG_SECONDARY_BLUE,
  },
  statHighlight: {
    backgroundColor: '#FDECEC',
    borderColor: '#FECACA',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: PRIMARY_BLUE,
  },
  statValueAlert: {
    color: ALERT_RED,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_MUTED,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  hint: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 18,
  },
  actions: {
    gap: 8,
  },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: ACCENT_BLUE,
    backgroundColor: BG_LIGHT_BLUE,
  },
  btnOutlineText: {
    fontSize: 15,
    fontWeight: '700',
    color: ACCENT_BLUE,
  },
  btnSolid: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSolidText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  btnPressed: {
    opacity: 0.88,
  },
});
