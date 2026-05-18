import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
} from 'react-native';
import {
  Bell,
  Camera,
  CloudUpload,
  Search,
  Smartphone,
  Volume2,
} from 'lucide-react-native';
import { appAlert } from '../services/appAlert';
import { useLoading } from '../context/LoadingContext';
import { saveCurrentUserSettingsToFirestore } from '../services/userSettingsFirestore';
import {
  useReduxDispatch,
  useReduxSelector,
  setNotificationsEnabled,
  setSoundEnabled,
  setVibrationEnabled,
  setDetectionConfidence,
  setCameraQuality,
  qualityPercentLabel,
  type CameraQualityOption,
} from '../store';
import { BRAND_HEADER_BG, TEXT_MUTED, TEXT_PRIMARY } from '../theme/brandColors';

const ICON = 20;
const ICON_COLOR = '#64748b';

type SettingRowProps = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
};

function SettingRow({ icon, title, subtitle, value, onChange, disabled }: SettingRowProps) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.iconSlot}>{icon}</View>
      <View style={rowStyles.info}>
        <Text style={rowStyles.title}>{title}</Text>
        {subtitle ? <Text style={rowStyles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: '#d1d5db', true: '#A8D4FF' }}
        thumbColor={value ? BRAND_HEADER_BG : '#9ca3af'}
      />
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  iconSlot: { width: 28, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '500', color: TEXT_PRIMARY },
  subtitle: { fontSize: 12, color: TEXT_MUTED, marginTop: 1 },
});

const QUALITIES: CameraQualityOption[] = [
  'Low (Faster)',
  'Medium',
  'High (Recommended)',
  'Ultra (Slower)',
];

export function SettingsScreen() {
  const { runWithLoading } = useLoading();
  const dispatch = useReduxDispatch();
  const s = useReduxSelector(state => state.settings);

  const onSave = async () => {
    try {
      await runWithLoading(async () => {
        await saveCurrentUserSettingsToFirestore(s);
      }, 'Saving settings…');
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'Could not save settings.';
      appAlert('Save failed', message);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Bell size={ICON} color={ICON_COLOR} strokeWidth={2} />
          <View>
            <Text style={styles.cardTitle}>Notifications</Text>
            <Text style={styles.cardSub}>Local preference flags</Text>
          </View>
        </View>
        <SettingRow
          icon={<Bell size={18} color={ICON_COLOR} strokeWidth={2} />}
          title="Enable notifications"
          subtitle="When supported by a future build"
          value={s.notificationsEnabled}
          onChange={v => dispatch(setNotificationsEnabled(v))}
        />
        <SettingRow
          icon={<Volume2 size={18} color={ICON_COLOR} strokeWidth={2} />}
          title="Sound"
          subtitle="With notifications"
          value={s.soundEnabled}
          onChange={v => dispatch(setSoundEnabled(v))}
          disabled={!s.notificationsEnabled}
        />
        <SettingRow
          icon={<Smartphone size={18} color={ICON_COLOR} strokeWidth={2} />}
          title="Vibration"
          subtitle="With notifications"
          value={s.vibrationEnabled}
          onChange={v => dispatch(setVibrationEnabled(v))}
          disabled={!s.notificationsEnabled}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Camera size={ICON} color={ICON_COLOR} strokeWidth={2} />
          <View>
            <Text style={styles.cardTitle}>Camera</Text>
            <Text style={styles.cardSub}>
              Camera & gallery JPEG · {qualityPercentLabel(s.cameraQuality)}
            </Text>
          </View>
        </View>
        <View style={styles.selectorWrap}>
          <Text style={styles.selectorLabel}>Quality preset</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
            {QUALITIES.map(q => (
              <Pressable
                key={q}
                style={[styles.pill, s.cameraQuality === q && styles.pillActive]}
                onPress={() => dispatch(setCameraQuality(q))}>
                <Text style={[styles.pillTxt, s.cameraQuality === q && styles.pillTxtActive]}>{q}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Search size={ICON} color={ICON_COLOR} strokeWidth={2} />
          <View>
            <Text style={styles.cardTitle}>Detection</Text>
            <Text style={styles.cardSub}>Display threshold; server rules still apply</Text>
          </View>
        </View>
        <View style={styles.sliderWrap}>
          <View style={styles.sliderLabelRow}>
            <Text style={styles.sliderLabel}>Confidence display</Text>
            <Text style={styles.sliderValue}>{s.detectionConfidence}%</Text>
          </View>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${s.detectionConfidence}%` }]} />
          </View>
          <View style={styles.sliderBtns}>
            <Pressable
              style={styles.sliderBtn}
              onPress={() => dispatch(setDetectionConfidence(s.detectionConfidence - 5))}>
              <Text style={styles.sliderBtnTxt}>−</Text>
            </Pressable>
            <Text style={styles.sliderHint}>Highlight above {s.detectionConfidence}% in the UI</Text>
            <Pressable
              style={styles.sliderBtn}
              onPress={() => dispatch(setDetectionConfidence(s.detectionConfidence + 5))}>
              <Text style={styles.sliderBtnTxt}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Pressable style={styles.saveBtn} onPress={onSave}>
        <View style={styles.saveBtnInner}>
          <CloudUpload size={18} color="#fff" strokeWidth={2.5} />
          <Text style={styles.saveBtnTxt}>Save settings</Text>
        </View>
      </Pressable>
      <Text style={styles.saveHint}>Synced to your account in Firebase — use any signed-in device.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  cardSub: { fontSize: 12, color: TEXT_MUTED },
  selectorWrap: { paddingVertical: 8, gap: 8 },
  selectorLabel: { fontSize: 13, fontWeight: '500', color: '#374151' },
  pillScroll: { flexGrow: 0 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
    backgroundColor: '#f9fafb',
  },
  pillActive: { backgroundColor: BRAND_HEADER_BG, borderColor: BRAND_HEADER_BG },
  pillTxt: { fontSize: 12, color: '#6b7280' },
  pillTxtActive: { color: '#fff', fontWeight: '600' },
  sliderWrap: { gap: 10 },
  sliderLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontSize: 13, fontWeight: '500', color: '#374151' },
  sliderValue: { fontSize: 13, fontWeight: '700', color: BRAND_HEADER_BG },
  sliderTrack: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: { height: 8, backgroundColor: BRAND_HEADER_BG, borderRadius: 4 },
  sliderBtns: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sliderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderBtnTxt: { color: BRAND_HEADER_BG, fontSize: 20, lineHeight: 24, fontWeight: '700' },
  sliderHint: { flex: 1, fontSize: 11, color: TEXT_MUTED, textAlign: 'center' },
  saveBtn: {
    backgroundColor: BRAND_HEADER_BG,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  saveHint: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginTop: -6,
    lineHeight: 17,
  },
});
