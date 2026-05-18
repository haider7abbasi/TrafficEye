import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Activity,
  Camera,
  ChevronRight,
  Film,
  Image as ImageIcon,
  Radio,
  StopCircle,
} from 'lucide-react-native';
import { TrafficEyeLogo } from '../TrafficEyeLogo';
import { LiveScanReportSection } from './LiveScanReportSection';
import type { LiveScanReport } from '../../types/liveScanReport';
import {
  ACCENT_BLUE,
  ALERT_RED,
  BG_LIGHT_BLUE,
  BG_SECONDARY_BLUE,
  BRAND_HEADER_BG,
  BRAND_HEADER_BG_DEEP,
  ON_PRIMARY_SUBTLE,
  PRIMARY_BLUE,
  SURFACE_PANEL,
  SURFACE_PANEL_BORDER,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TRAFFIC_GOLD,
  VIOLATION_HELMET,
  VIOLATION_PHONE,
  VIOLATION_SEATBELT,
} from '../../theme/brandColors';

const DETECTION_TAGS = [
  { label: 'Seatbelt', color: VIOLATION_SEATBELT },
  { label: 'Helmet', color: VIOLATION_HELMET },
  { label: 'Phone', color: VIOLATION_PHONE },
] as const;

type ActionProps = {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'live' | 'danger';
  fullWidth?: boolean;
  compact?: boolean;
};

function ActionTile({
  title,
  subtitle,
  icon,
  onPress,
  disabled,
  variant = 'secondary',
  fullWidth,
  compact,
}: ActionProps) {
  const variantStyle =
    variant === 'primary'
      ? styles.tilePrimary
      : variant === 'live'
        ? styles.tileLive
        : variant === 'danger'
          ? styles.tileDanger
          : styles.tileSecondary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionTile,
        compact && styles.actionTileCompact,
        variantStyle,
        fullWidth && styles.actionTileFull,
        pressed && styles.actionTilePressed,
        disabled && styles.actionTileDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      accessibilityState={{ disabled: !!disabled }}>
      <View
        style={[
          styles.tileIconWrap,
          compact && styles.tileIconWrapCompact,
          variant === 'primary' && styles.tileIconWrapOnPrimary,
          variant === 'danger' && styles.tileIconWrapOnDanger,
          variant === 'live' && styles.tileIconWrapOnLive,
        ]}>
        {icon}
      </View>
      <View style={styles.tileTextCol}>
        <Text
          style={[
            styles.tileTitle,
            compact && styles.tileTitleCompact,
            variant === 'live' && styles.tileTitleOnGold,
            variant === 'primary' && styles.tileTitleOnPrimary,
          ]}
          numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.tileSubtitle,
              variant === 'primary' && styles.tileSubtitleOnPrimary,
              variant === 'live' && styles.tileSubtitleOnGold,
            ]}
            numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {!compact ? (
        <ChevronRight
          size={18}
          color={
            variant === 'primary' ? ON_PRIMARY_SUBTLE : variant === 'live' ? '#6B5200' : TEXT_MUTED
          }
          strokeWidth={2.2}
        />
      ) : null}
    </Pressable>
  );
}

type KpiProps = { label: string; value: string | number; accent?: 'default' | 'alert' | 'gold' };

function KpiCard({ label, value, accent = 'default' }: KpiProps) {
  return (
    <View style={styles.kpiCard}>
      <Text
        style={[
          styles.kpiValue,
          accent === 'alert' && styles.kpiValueAlert,
          accent === 'gold' && styles.kpiValueGold,
        ]}>
        {value}
      </Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

export type CaptureHomeDashboardProps = {
  officerName?: string;
  busyBannerText: string;
  totalRecords: number;
  violationsFound: number;
  liveRunning: boolean;
  liveFrames: number;
  liveViolations: number;
  liveLastInfo: string;
  interactionLocked: boolean;
  onCapturePhoto: () => void;
  onPickGallery: () => void;
  onScanVideo: () => void;
  onStartLive: () => void;
  onStopLive: () => void;
  lastLiveScanReport?: LiveScanReport | null;
  onViewLiveScanReport?: () => void;
  onOpenQueueFromReport?: () => void;
};

export function CaptureHomeDashboard({
  officerName,
  busyBannerText,
  totalRecords,
  violationsFound,
  liveRunning,
  liveFrames,
  liveViolations,
  liveLastInfo,
  interactionLocked,
  onCapturePhoto,
  onPickGallery,
  onScanVideo,
  onStartLive,
  onStopLive,
  lastLiveScanReport,
  onViewLiveScanReport,
  onOpenQueueFromReport,
}: CaptureHomeDashboardProps) {
  const statusLabel = liveRunning ? 'Live' : busyBannerText ? 'Busy' : 'Ready';

  return (
    <View style={styles.root}>
      {busyBannerText ? (
        <View style={styles.statusBanner} accessibilityLiveRegion="polite">
          <Activity size={16} color={liveRunning ? PRIMARY_BLUE : '#8A6D00'} strokeWidth={2.2} />
          <Text style={styles.statusBannerText} numberOfLines={2}>
            {busyBannerText}
          </Text>
        </View>
      ) : null}

      <View style={styles.commandHeader}>
        <View style={styles.commandHeaderTop}>
          <View style={styles.commandIconWrap}>
            <TrafficEyeLogo size={36} />
          </View>
          <View style={styles.commandTextCol}>
            <Text style={styles.commandTitle}>Traffic Eye</Text>
            {officerName ? (
              <Text style={styles.commandOfficer} numberOfLines={1}>
                {officerName}
              </Text>
            ) : (
              <Text style={styles.commandTagline}>AI violation detection</Text>
            )}
          </View>
          <View
            style={[
              styles.statusChip,
              liveRunning && styles.statusChipLive,
              !!busyBannerText && !liveRunning && styles.statusChipBusy,
            ]}>
            <View
              style={[
                styles.statusDot,
                liveRunning && styles.statusDotLive,
                !!busyBannerText && !liveRunning && styles.statusDotBusy,
              ]}
            />
            <Text style={styles.statusChipText}>{statusLabel}</Text>
          </View>
        </View>
        <View style={styles.detectionTags}>
          {DETECTION_TAGS.map(tag => (
            <View key={tag.label} style={[styles.detectionTag, { borderColor: tag.color }]}>
              <View style={[styles.detectionTagDot, { backgroundColor: tag.color }]} />
              <Text style={styles.detectionTagText}>{tag.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.kpiRow}>
        <KpiCard label="Saved" value={totalRecords} />
        <KpiCard label="Flags" value={violationsFound} accent="alert" />
        <KpiCard
          label="Live"
          value={liveRunning ? liveFrames : '—'}
          accent={liveRunning ? 'gold' : 'default'}
        />
      </View>

      {!liveRunning && lastLiveScanReport && onViewLiveScanReport ? (
        <LiveScanReportSection
          report={lastLiveScanReport}
          onViewDetails={onViewLiveScanReport}
          onViewQueue={onOpenQueueFromReport}
        />
      ) : null}

      <View style={styles.actionsCard}>
        <ActionTile
          title="Take photo"
          subtitle="Camera capture"
          icon={<Camera size={22} color="#fff" strokeWidth={2.2} />}
          onPress={onCapturePhoto}
          disabled={interactionLocked}
          variant="primary"
          fullWidth
        />

        <View style={styles.actionGrid}>
          <ActionTile
            title="Gallery"
            icon={<ImageIcon size={20} color={ACCENT_BLUE} strokeWidth={2.2} />}
            onPress={onPickGallery}
            disabled={interactionLocked}
            compact
          />
          <ActionTile
            title="Video"
            icon={<Film size={20} color={ACCENT_BLUE} strokeWidth={2.2} />}
            onPress={onScanVideo}
            disabled={interactionLocked}
            compact
          />
        </View>

        {!liveRunning ? (
          <ActionTile
            title="Live monitor"
            subtitle="Rear camera"
            icon={<Radio size={20} color="#6B5200" strokeWidth={2.2} />}
            onPress={onStartLive}
            disabled={interactionLocked}
            variant="live"
            fullWidth
          />
        ) : (
          <>
            <ActionTile
              title="Stop live"
              subtitle={`${liveFrames} frames · ${liveViolations} saved`}
              icon={<StopCircle size={20} color="#fff" strokeWidth={2.2} />}
              onPress={onStopLive}
              variant="danger"
              fullWidth
            />
            <View style={styles.liveStrip}>
              <Text style={styles.liveStripLabel} numberOfLines={2}>
                {liveLastInfo}
              </Text>
            </View>
          </>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14, paddingBottom: 8 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(244, 180, 0, 0.12)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(244, 180, 0, 0.35)',
  },
  statusBannerText: {
    flex: 1,
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 16,
    fontWeight: '600',
  },
  commandHeader: {
    backgroundColor: BRAND_HEADER_BG,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: BRAND_HEADER_BG_DEEP,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  commandHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  commandIconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commandTextCol: { flex: 1, minWidth: 0, gap: 2 },
  commandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  commandOfficer: {
    fontSize: 13,
    fontWeight: '600',
    color: ON_PRIMARY_SUBTLE,
  },
  commandTagline: {
    fontSize: 12,
    fontWeight: '600',
    color: ON_PRIMARY_SUBTLE,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  statusChipLive: {
    backgroundColor: 'rgba(244, 180, 0, 0.25)',
  },
  statusChipBusy: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#93C5FD',
  },
  statusDotLive: { backgroundColor: TRAFFIC_GOLD },
  statusDotBusy: { backgroundColor: '#fff' },
  statusChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
  },
  detectionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detectionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
  },
  detectionTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  detectionTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: SURFACE_PANEL,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  kpiValueAlert: { color: ALERT_RED },
  kpiValueGold: { color: '#8A6D00' },
  kpiLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
  },
  actionsCard: {
    backgroundColor: SURFACE_PANEL,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
    padding: 12,
    gap: 10,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 64,
  },
  actionTileCompact: {
    minHeight: 56,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  actionTileFull: {
    flex: undefined,
    width: '100%',
  },
  actionTilePressed: { opacity: 0.92 },
  actionTileDisabled: { opacity: 0.55 },
  tilePrimary: {
    backgroundColor: PRIMARY_BLUE,
    borderColor: BRAND_HEADER_BG_DEEP,
  },
  tileSecondary: {
    backgroundColor: BG_LIGHT_BLUE,
    borderColor: BG_SECONDARY_BLUE,
  },
  tileLive: {
    backgroundColor: 'rgba(244, 180, 0, 0.14)',
    borderColor: TRAFFIC_GOLD,
  },
  tileDanger: {
    backgroundColor: ALERT_RED,
    borderColor: '#9A0007',
  },
  tileIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIconWrapCompact: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  tileIconWrapOnPrimary: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tileIconWrapOnDanger: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tileIconWrapOnLive: { backgroundColor: 'rgba(244, 180, 0, 0.25)' },
  tileTextCol: { flex: 1, minWidth: 0, gap: 1 },
  tileTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  tileTitleCompact: {
    fontSize: 14,
  },
  tileTitleOnPrimary: { color: '#fff' },
  tileTitleOnGold: { color: '#3D2E00' },
  tileSubtitle: {
    fontSize: 11,
    color: TEXT_MUTED,
  },
  tileSubtitleOnPrimary: { color: ON_PRIMARY_SUBTLE },
  tileSubtitleOnGold: { color: '#6B5200' },
  liveStrip: {
    backgroundColor: BG_LIGHT_BLUE,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  liveStripLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 16,
    textAlign: 'center',
  },
});
