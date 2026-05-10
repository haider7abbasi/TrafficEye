import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import {
  persistor,
  useReduxDispatch,
  useReduxSelector,
  setNotificationsEnabled,
  setSoundEnabled,
  setVibrationEnabled,
  setDarkMode,
  setAutoSavePhotos,
  setDetectionConfidence,
  setCameraQuality,
  setLanguage,
  resetSettings,
  type CameraQualityOption,
  type LanguageOption,
} from '../store';

type SettingRowProps = {
  icon: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
};

function SettingRow({ icon, title, subtitle, value, onChange, disabled }: SettingRowProps) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.icon}>{icon}</Text>
      <View style={rowStyles.info}>
        <Text style={rowStyles.title}>{title}</Text>
        {subtitle && <Text style={rowStyles.subtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
        thumbColor={value ? '#2563eb' : '#9ca3af'}
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
  icon: { fontSize: 18, width: 28, textAlign: 'center' },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '500', color: '#111827' },
  subtitle: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
});

const QUALITIES: CameraQualityOption[] = [
  'Low (Faster)',
  'Medium',
  'High (Recommended)',
  'Ultra (Slower)',
];

const LANGUAGES: LanguageOption[] = ['English', 'Español', 'Français', 'Deutsch', '中文'];

export function SettingsScreen() {
  const dispatch = useReduxDispatch();
  const s = useReduxSelector(state => state.settings);

  const onSave = async () => {
    try {
      await persistor.flush();
      Alert.alert('Saved', 'Preferences are stored on this device (AsyncStorage).');
    } catch {
      Alert.alert('Save failed', 'Could not write preferences to storage.');
    }
  };

  const onClearLocalPreferences = () => {
    Alert.alert(
      'Clear local preferences?',
      'Resets TrafficEye settings on this device only. It does not delete your account or cloud data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            dispatch(resetSettings());
            await persistor.flush();
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.sectionIcon}>🔔</Text>
          <View>
            <Text style={styles.cardTitle}>Notifications</Text>
            <Text style={styles.cardSub}>Manage your notification preferences</Text>
          </View>
        </View>
        <SettingRow
          icon="🔔"
          title="Enable Notifications"
          subtitle="Receive alerts for violations"
          value={s.notificationsEnabled}
          onChange={v => dispatch(setNotificationsEnabled(v))}
        />
        <SettingRow
          icon="🔊"
          title="Sound"
          subtitle="Play notification sounds"
          value={s.soundEnabled}
          onChange={v => dispatch(setSoundEnabled(v))}
          disabled={!s.notificationsEnabled}
        />
        <SettingRow
          icon="📳"
          title="Vibration"
          subtitle="Vibrate on notifications"
          value={s.vibrationEnabled}
          onChange={v => dispatch(setVibrationEnabled(v))}
          disabled={!s.notificationsEnabled}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.sectionIcon}>👁</Text>
          <View>
            <Text style={styles.cardTitle}>Appearance</Text>
            <Text style={styles.cardSub}>Customize the app appearance</Text>
          </View>
        </View>
        <SettingRow
          icon={s.darkMode ? '🌙' : '☀️'}
          title="Dark Mode"
          subtitle="Use dark theme (UI wiring can follow this flag)"
          value={s.darkMode}
          onChange={v => dispatch(setDarkMode(v))}
        />
        <View style={styles.selectorWrap}>
          <Text style={styles.selectorLabel}>🌐 Language</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
            {LANGUAGES.map(l => (
              <Pressable
                key={l}
                style={[styles.pill, s.language === l && styles.pillActive]}
                onPress={() => dispatch(setLanguage(l))}>
                <Text style={[styles.pillTxt, s.language === l && styles.pillTxtActive]}>{l}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.sectionIcon}>📷</Text>
          <View>
            <Text style={styles.cardTitle}>Camera</Text>
            <Text style={styles.cardSub}>Configure camera settings</Text>
          </View>
        </View>
        <View style={styles.selectorWrap}>
          <Text style={styles.selectorLabel}>Camera Quality</Text>
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
        <SettingRow
          icon="💾"
          title="Auto-save Photos"
          subtitle="Automatically save captured images (policy placeholder)"
          value={s.autoSavePhotos}
          onChange={v => dispatch(setAutoSavePhotos(v))}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.sectionIcon}>🔍</Text>
          <View>
            <Text style={styles.cardTitle}>Detection</Text>
            <Text style={styles.cardSub}>
              UI preference only — Roboflow thresholds still come from env / server policy.
            </Text>
          </View>
        </View>
        <View style={styles.sliderWrap}>
          <View style={styles.sliderLabelRow}>
            <Text style={styles.sliderLabel}>Confidence Threshold</Text>
            <Text style={styles.sliderValue}>{s.detectionConfidence}%</Text>
          </View>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${s.detectionConfidence}%` }]} />
          </View>
          <View style={styles.sliderBtns}>
            <Pressable
              style={styles.sliderBtn}
              onPress={() =>
                dispatch(setDetectionConfidence(s.detectionConfidence - 5))
              }>
              <Text style={styles.sliderBtnTxt}>−</Text>
            </Pressable>
            <Text style={styles.sliderHint}>
              Only flag violations above {s.detectionConfidence}% confidence
            </Text>
            <Pressable
              style={styles.sliderBtn}
              onPress={() =>
                dispatch(setDetectionConfidence(s.detectionConfidence + 5))
              }>
              <Text style={styles.sliderBtnTxt}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.sectionIcon}>🔒</Text>
          <View>
            <Text style={styles.cardTitle}>Privacy & Security</Text>
            <Text style={styles.cardSub}>Manage your privacy settings</Text>
          </View>
        </View>
        {['Change Password', 'Two-Factor Authentication'].map(label => (
          <Pressable key={label} style={styles.outlineBtn}>
            <Text style={styles.outlineBtnTxt}>{label}</Text>
          </Pressable>
        ))}
        <Pressable style={[styles.outlineBtn, styles.dangerBtn]} onPress={onClearLocalPreferences}>
          <Text style={styles.dangerBtnTxt}>Clear local preferences</Text>
        </Pressable>
      </View>

      <Pressable style={styles.saveBtn} onPress={onSave}>
        <Text style={styles.saveBtnTxt}>Save to device storage</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 14, gap: 14, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  sectionIcon: { fontSize: 20 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 12, color: '#9ca3af' },
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
  pillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pillTxt: { fontSize: 12, color: '#6b7280' },
  pillTxtActive: { color: '#fff', fontWeight: '600' },
  sliderWrap: { gap: 10 },
  sliderLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontSize: 13, fontWeight: '500', color: '#374151' },
  sliderValue: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
  sliderTrack: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: { height: 8, backgroundColor: '#2563eb', borderRadius: 4 },
  sliderBtns: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sliderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderBtnTxt: { color: '#2563eb', fontSize: 20, lineHeight: 24, fontWeight: '700' },
  sliderHint: { flex: 1, fontSize: 11, color: '#9ca3af', textAlign: 'center' },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  outlineBtnTxt: { fontSize: 14, color: '#374151', fontWeight: '500' },
  dangerBtn: { borderColor: '#fecaca' },
  dangerBtnTxt: { color: '#dc2626', fontSize: 14, fontWeight: '500' },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
