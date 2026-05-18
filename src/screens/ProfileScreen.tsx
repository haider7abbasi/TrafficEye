import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import {
  IdCard,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  Shield,
  User,
  X,
} from 'lucide-react-native';
import { appAlert } from '../services/appAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useLoading } from '../context/LoadingContext';
import { BRAND_ACCENT, BRAND_HEADER_BG, TEXT_MUTED, TEXT_PRIMARY } from '../theme/brandColors';

const FIELD_ICON = 18;
const FIELD_ICON_COLOR = '#64748b';

type FieldKey = 'name' | 'email' | 'phone' | 'department' | 'location' | 'badgeNumber';

const FIELDS: { key: FieldKey; label: string; Icon: typeof User }[] = [
  { key: 'name', label: 'Full name', Icon: User },
  { key: 'email', label: 'Email', Icon: Mail },
  { key: 'phone', label: 'Phone', Icon: Phone },
  { key: 'department', label: 'Department', Icon: Shield },
  { key: 'location', label: 'Location', Icon: MapPin },
  { key: 'badgeNumber', label: 'Badge number', Icon: IdCard },
];

export function ProfileScreen() {
  const { user, updateUser, records, logout } = useApp();
  const { runWithLoading } = useLoading();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    department: user?.department ?? '',
    location: user?.location ?? '',
    badgeNumber: user?.badgeNumber ?? '',
  });

  const initials = form.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const totalCaptures = records.length;
  const violationsFound = records.filter(r => r.violations.length > 0).length;

  const { monthCount, avgConfidence } = useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    const month = records.filter(r => {
      const d = new Date(r.timestamp);
      return d.getMonth() === m && d.getFullYear() === y;
    }).length;
    const avg =
      records.length > 0
        ? Math.round(records.reduce((acc, v) => acc + v.confidence, 0) / records.length)
        : 0;
    return { monthCount: month, avgConfidence: avg };
  }, [records]);

  useEffect(() => {
    if (!user) {
      return;
    }
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      department: user.department,
      location: user.location,
      badgeNumber: user.badgeNumber,
    });
  }, [user]);

  const handleSave = async () => {
    try {
      await runWithLoading(() => updateUser(form), 'Saving profile…');
      setEditing(false);
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'Failed to save profile.';
      console.warn('[Profile save]', message);
    }
  };

  const confirmLogout = () => {
    appAlert('Log out', 'Sign out of TrafficEye on this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  const handleCancel = () => {
    setForm({
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      department: user?.department ?? '',
      location: user?.location ?? '',
      badgeNumber: user?.badgeNumber ?? '',
    });
    setEditing(false);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      showsVerticalScrollIndicator>
      <View style={styles.avatarCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.profileName}>{form.name}</Text>
        <Text style={styles.profileEmail}>{form.email}</Text>
        <View style={styles.rolePill}>
          <Shield size={14} color={BRAND_HEADER_BG} strokeWidth={2.2} />
          <Text style={styles.roleText}>{user?.role ?? 'Officer'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Text style={styles.cardSub}>Sign out of TrafficEye on this device</Text>
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
          onPress={confirmLogout}
          accessibilityRole="button"
          accessibilityLabel="Log out">
          <LogOut size={18} color="#fff" strokeWidth={2.5} />
          <Text style={styles.logoutBtnTxt}>Log out</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Profile</Text>
            <Text style={styles.cardSub}>Details used in the app</Text>
          </View>
          {!editing ? (
            <Pressable style={styles.editBtn} onPress={() => setEditing(true)} accessibilityRole="button">
              <View style={styles.btnRow}>
                <Pencil size={14} color="#374151" strokeWidth={2} />
                <Text style={styles.editBtnText}>Edit</Text>
              </View>
            </Pressable>
          ) : (
            <View style={styles.actionRow}>
              <Pressable style={styles.cancelBtn} onPress={handleCancel} accessibilityRole="button">
                <View style={styles.btnRow}>
                  <X size={14} color="#6b7280" strokeWidth={2} />
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </View>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleSave} accessibilityRole="button">
                <View style={styles.btnRow}>
                  <Save size={14} color="#fff" strokeWidth={2} />
                  <Text style={styles.saveBtnText}>Save</Text>
                </View>
              </Pressable>
            </View>
          )}
        </View>

        {FIELDS.map(field => (
          <View key={field.key} style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <View style={styles.fieldRow}>
              <View style={styles.fieldIconSlot}>
                <field.Icon size={FIELD_ICON} color={FIELD_ICON_COLOR} strokeWidth={2} />
              </View>
              <TextInput
                style={[
                  styles.fieldInput,
                  (!editing || field.key === 'email') && styles.fieldInputDisabled,
                ]}
                value={form[field.key]}
                onChangeText={val => setForm(prev => ({ ...prev, [field.key]: val }))}
                editable={editing && field.key !== 'email'}
                keyboardType={field.key === 'email' ? 'email-address' : 'default'}
              />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Activity on this device</Text>
        <Text style={styles.cardSub}>From your saved scan history</Text>
        <View style={styles.statsGrid}>
          <StatBox value={totalCaptures} label="Total saves" color={BRAND_HEADER_BG} bg="#EAF4FF" />
          <StatBox value={violationsFound} label="With violations" color="#dc2626" bg="#fef2f2" />
          <StatBox value={monthCount} label="This month" color={BRAND_HEADER_BG} bg="#DCEEFF" />
          <StatBox value={`${avgConfidence}%`} label="Avg confidence" color="#6d28d9" bg="#f5f3ff" />
        </View>
      </View>
    </ScrollView>
  );
}

function StatBox({
  value,
  label,
  color,
  bg,
}: {
  value: string | number;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[statStyles.box, { backgroundColor: bg }]}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center', minWidth: '45%' },
  value: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 11, color: TEXT_MUTED, marginTop: 2, textAlign: 'center' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16, gap: 14 },
  avatarCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BRAND_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  profileName: { fontSize: 22, fontWeight: '800', color: TEXT_PRIMARY },
  profileEmail: { fontSize: 13, color: TEXT_MUTED },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAF4FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  roleText: { color: BRAND_HEADER_BG, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  cardSub: { fontSize: 12, color: TEXT_MUTED },
  editBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 8 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelBtnText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  saveBtn: {
    backgroundColor: BRAND_ACCENT,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  saveBtnText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f9fafb',
    gap: 8,
  },
  fieldIconSlot: { width: 26, alignItems: 'center', justifyContent: 'center' },
  fieldInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
  },
  fieldInputDisabled: { color: '#6b7280' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 4,
  },
  logoutBtnPressed: { opacity: 0.9 },
  logoutBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
