import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import { useApp } from '../context/AppContext';

const WEEKLY_DATA = [
  { day: 'Mon', count: 12 },
  { day: 'Tue', count: 18 },
  { day: 'Wed', count: 8 },
  { day: 'Thu', count: 15 },
  { day: 'Fri', count: 22 },
  { day: 'Sat', count: 9 },
  { day: 'Sun', count: 6 },
];

const TIME_RANGES = ['Today', 'This Week', 'This Month', 'This Year'];

export function AnalyticsScreen() {
  const { records } = useApp();
  const [timeRange, setTimeRange] = useState('This Week');

  const totalViolations = records.length;
  const detectedViolations = records.filter(v => v.violations.length > 0).length;
  const avgConfidence =
    records.length > 0
      ? Math.round(records.reduce((acc, v) => acc + v.confidence, 0) / records.length)
      : 0;
  const weeklyTotal = WEEKLY_DATA.reduce((a, d) => a + d.count, 0);
  const maxCount = Math.max(...WEEKLY_DATA.map(d => d.count));

  const violationCounts = records.reduce<Record<string, number>>((acc, v) => {
    v.violations.forEach(vio => {
      acc[vio] = (acc[vio] || 0) + 1;
    });
    return acc;
  }, {});
  const topViolations = Object.entries(violationCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const rankColors = ['#dc2626', '#ea580c', '#ca8a04', '#6b7280', '#6b7280'];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Time Range Selector */}
      <View style={styles.rangeRow}>
        <Text style={styles.pageTitle}>Analytics</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rangeScroll}>
          {TIME_RANGES.map(r => (
            <Pressable
              key={r}
              style={[styles.rangeBtn, timeRange === r && styles.rangeBtnActive]}
              onPress={() => setTimeRange(r)}>
              <Text style={[styles.rangeTxt, timeRange === r && styles.rangeTxtActive]}>{r}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <MetricCard icon="📊" label="Total Records" value={totalViolations} color="#2563eb" sub="+12% vs last week" subColor="#16a34a" />
        <MetricCard icon="⚠️" label="Violations" value={detectedViolations} color="#dc2626" sub="+8% vs last week" subColor="#16a34a" />
        <MetricCard icon="✅" label="Avg Confidence" value={`${avgConfidence}%`} color="#16a34a" sub="Detection accuracy" subColor="#6b7280" />
        <MetricCard icon="🕐" label="This Week" value={weeklyTotal} color="#7c3aed" sub="Total detections" subColor="#6b7280" />
      </View>

      {/* Weekly Chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weekly Activity</Text>
        <Text style={styles.cardSub}>Violations detected per day</Text>
        <View style={styles.chartWrap}>
          {WEEKLY_DATA.map(data => (
            <View key={data.day} style={styles.chartRow}>
              <Text style={styles.chartDay}>{data.day}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${(data.count / maxCount) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.chartCount}>{data.count}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Top Violations */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top Violations</Text>
        <Text style={styles.cardSub}>Most common violations detected</Text>
        {topViolations.length > 0 ? (
          topViolations.map(([violation, count], index) => (
            <View key={violation} style={styles.rankRow}>
              <View style={[styles.rankBadge, { backgroundColor: rankColors[index] }]}>
                <Text style={styles.rankNum}>{index + 1}</Text>
              </View>
              <View style={styles.rankInfo}>
                <Text style={styles.rankName}>{violation}</Text>
                <Text style={styles.rankSub}>{count} incidents</Text>
              </View>
              <Text style={styles.rankCount}>{count}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>⚠️</Text>
            <Text style={styles.emptyText}>No violations recorded yet</Text>
          </View>
        )}
      </View>

      {/* Recent Activity */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Activity</Text>
        <Text style={styles.cardSub}>Latest violation records</Text>
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
                  <Text style={styles.activityConf}>{rec.confidence}% conf.</Text>
                </View>
                <Text style={styles.activityViolations} numberOfLines={1}>
                  {rec.violations.join(', ') || 'No violations detected'}
                </Text>
                <View style={styles.activityLocRow}>
                  <Text style={styles.locIcon}>📍</Text>
                  <Text style={styles.activityLoc}>{rec.location}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No recent activity</Text>
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
  icon: string;
  label: string;
  value: string | number;
  color: string;
  sub: string;
  subColor: string;
}) {
  return (
    <View style={metricStyles.card}>
      <Text style={metricStyles.label}>
        {icon} {label}
      </Text>
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
  label: { fontSize: 11, color: '#6b7280' },
  value: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 11 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 14, gap: 14, paddingBottom: 30 },
  rangeRow: { gap: 10 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  rangeScroll: { flexGrow: 0 },
  rangeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  rangeBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  rangeTxt: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  rangeTxtActive: { color: '#fff', fontWeight: '700' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 12, color: '#9ca3af', marginTop: -4 },
  chartWrap: { gap: 10 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chartDay: { width: 32, fontSize: 12, color: '#6b7280' },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: 8, backgroundColor: '#2563eb', borderRadius: 4 },
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
  rankName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  rankSub: { fontSize: 11, color: '#9ca3af' },
  rankCount: { fontSize: 14, fontWeight: '700', color: '#374151' },
  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 13, color: '#9ca3af' },
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
  pillGreen: { backgroundColor: '#f0fdf4' },
  pillText: { fontSize: 11, fontWeight: '600' },
  pillTextRed: { color: '#dc2626' },
  pillTextGreen: { color: '#16a34a' },
  activityConf: { fontSize: 11, color: '#9ca3af' },
  activityViolations: { fontSize: 12, fontWeight: '600', color: '#374151' },
  activityLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locIcon: { fontSize: 11 },
  activityLoc: { fontSize: 11, color: '#9ca3af' },
});
