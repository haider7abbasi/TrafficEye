import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  ClipboardList,
  MapPin,
  ShieldCheck,
} from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import {
  ALERT_RED,
  BRAND_HEADER_BG,
  PRIMARY_BLUE,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TRAFFIC_GOLD,
} from '../theme/brandColors';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function weekCountsFromRecords(records: { timestamp: string | number }[]) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  records.forEach(r => {
    const d = new Date(r.timestamp);
    const monIdx = (d.getDay() + 6) % 7;
    counts[monIdx]++;
  });
  const max = Math.max(1, ...counts);
  return { rows: DAYS.map((day, i) => ({ day, count: counts[i] })), max };
}

export function AnalyticsScreen() {
  const { records } = useApp();

  const totalViolations = records.length;
  const detectedViolations = records.filter(v => v.violations.length > 0).length;
  const avgConfidence =
    records.length > 0
      ? Math.round(records.reduce((acc, v) => acc + v.confidence, 0) / records.length)
      : 0;

  const { rows: weekRows, max: weekMax } = useMemo(() => weekCountsFromRecords(records), [records]);

  const violationCounts = records.reduce<Record<string, number>>((acc, v) => {
    v.violations.forEach(vio => {
      acc[vio] = (acc[vio] || 0) + 1;
    });
    return acc;
  }, {});
  const topViolations = Object.entries(violationCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const rankColors = [ALERT_RED, '#E65100', TRAFFIC_GOLD, TEXT_MUTED, TEXT_MUTED];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Analytics</Text>
      <Text style={styles.pageSub}>Counts from scans saved on this device</Text>

      <View style={styles.metricsGrid}>
        <MetricCard
          icon={<ClipboardList size={16} color={TEXT_MUTED} strokeWidth={2} />}
          label="Total records"
          value={totalViolations}
          color={BRAND_HEADER_BG}
          sub="Saved captures"
          subColor={TEXT_MUTED}
        />
        <MetricCard
          icon={<AlertTriangle size={16} color={TEXT_MUTED} strokeWidth={2} />}
          label="With violations"
          value={detectedViolations}
          color={ALERT_RED}
          sub="Flagged in model output"
          subColor={TEXT_MUTED}
        />
        <MetricCard
          icon={<ShieldCheck size={16} color={TEXT_MUTED} strokeWidth={2} />}
          label="Avg confidence"
          value={`${avgConfidence}%`}
          color={BRAND_HEADER_BG}
          sub="Across saved records"
          subColor={TEXT_MUTED}
        />
        <MetricCard
          icon={<BarChart3 size={16} color={TEXT_MUTED} strokeWidth={2} />}
          label="This week total"
          value={weekRows.reduce((a, r) => a + r.count, 0)}
          color={TRAFFIC_GOLD}
          sub="Mon–Sun on device"
          subColor={TEXT_MUTED}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Saved scans by weekday</Text>
        <Text style={styles.cardSub}>Based on each record&apos;s timestamp</Text>
        <View style={styles.chartWrap}>
          {weekRows.map(data => (
            <View key={data.day} style={styles.chartRow}>
              <Text style={styles.chartDay}>{data.day}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${(data.count / weekMax) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.chartCount}>{data.count}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Violation labels</Text>
        <Text style={styles.cardSub}>Frequency in saved records</Text>
        {topViolations.length > 0 ? (
          topViolations.map(([violation, count], index) => (
            <View key={violation} style={styles.rankRow}>
              <View style={[styles.rankBadge, { backgroundColor: rankColors[index] }]}>
                <Text style={styles.rankNum}>{index + 1}</Text>
              </View>
              <View style={styles.rankInfo}>
                <Text style={styles.rankName}>{violation}</Text>
                <Text style={styles.rankSub}>{count} saves</Text>
              </View>
              <Text style={styles.rankCount}>{count}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyBox}>
            <ClipboardList size={36} color="#cbd5e1" strokeWidth={1.8} />
            <Text style={styles.emptyText}>No violation labels yet</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent activity</Text>
        <Text style={styles.cardSub}>Latest five saves</Text>
        {records.slice(0, 5).length > 0 ? (
          records.slice(0, 5).map(rec => (
            <View key={rec.id} style={styles.activityRow}>
              <Image source={{ uri: rec.imageUri }} style={styles.activityThumb} />
              <View style={styles.activityInfo}>
                <View style={styles.activityTopRow}>
                  <View style={[styles.statusPill, rec.violations.length > 0 ? styles.pillRed : styles.pillGreen]}>
                    <Text style={[styles.pillText, rec.violations.length > 0 ? styles.pillTextRed : styles.pillTextGreen]}>
                      {rec.violations.length > 0 ? 'Violation' : 'Clear'}
                    </Text>
                  </View>
                  <Text style={styles.activityConf}>{rec.confidence}%</Text>
                </View>
                <Text style={styles.activityViolations} numberOfLines={1}>
                  {rec.violations.join(', ') || 'No violations'}
                </Text>
                <View style={styles.activityLocRow}>
                  <MapPin size={12} color="#9ca3af" strokeWidth={2} />
                  <Text style={styles.activityLoc}>{rec.location}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyBox}>
            <Calendar size={36} color="#cbd5e1" strokeWidth={1.8} />
            <Text style={styles.emptyText}>No saved activity yet</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
  sub,
  subColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  sub: string;
  subColor: string;
}) {
  return (
    <View style={metricStyles.card}>
      <View style={metricStyles.labelRow}>
        {icon}
        <Text style={metricStyles.label}>{label}</Text>
      </View>
      <Text style={[metricStyles.value, { color }]}>{value}</Text>
      <Text style={[metricStyles.sub, { color: subColor }]}>{sub}</Text>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4,
    minWidth: '45%',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 11, color: TEXT_MUTED, flex: 1 },
  value: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 11 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: TEXT_PRIMARY },
  pageSub: { fontSize: 13, color: TEXT_MUTED, marginTop: -6 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  cardSub: { fontSize: 12, color: TEXT_MUTED, marginTop: -4 },
  chartWrap: { gap: 10 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chartDay: { width: 32, fontSize: 12, color: TEXT_MUTED },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: 8, backgroundColor: PRIMARY_BLUE, borderRadius: 4 },
  chartCount: { width: 24, fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'right' },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNum: { color: '#fff', fontSize: 13, fontWeight: '700' },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 13, fontWeight: '600', color: TEXT_PRIMARY },
  rankSub: { fontSize: 11, color: TEXT_MUTED },
  rankCount: { fontSize: 14, fontWeight: '700', color: '#374151' },
  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  emptyText: { fontSize: 13, color: TEXT_MUTED },
  activityRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityThumb: { width: 64, height: 64, borderRadius: 8 },
  activityInfo: { flex: 1, gap: 4 },
  activityTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  pillRed: { backgroundColor: '#fef2f2' },
  pillGreen: { backgroundColor: '#EAF4FF' },
  pillText: { fontSize: 11, fontWeight: '600' },
  pillTextRed: { color: '#dc2626' },
  pillTextGreen: { color: BRAND_HEADER_BG },
  activityConf: { fontSize: 11, color: TEXT_MUTED },
  activityViolations: { fontSize: 12, fontWeight: '600', color: '#374151' },
  activityLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  activityLoc: { fontSize: 11, color: TEXT_MUTED, flex: 1 },
});
