import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import { useApp } from '../context/AppContext';

export function ProfileScreen() {
  const { user, updateUser, records } = useApp();
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
    await updateUser(form);
    setEditing(false);
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
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Avatar Card */}
      <View style={styles.avatarCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.profileName}>{form.name}</Text>
        <Text style={styles.profileEmail}>{form.email}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleIcon}>🛡️</Text>
          <Text style={styles.roleText}>{user?.role ?? 'Officer'}</Text>
        </View>
      </View>

      {/* Profile Details */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Profile Information</Text>
            <Text style={styles.cardSub}>Manage your personal details</Text>
          </View>
          {!editing ? (
            <Pressable style={styles.editBtn} onPress={() => setEditing(true)}>
              <Text style={styles.editBtnText}>✏ Edit</Text>
            </Pressable>
          ) : (
            <View style={styles.actionRow}>
              <Pressable style={styles.cancelBtn} onPress={handleCancel}>
                <Text style={styles.cancelBtnText}>✕ Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>💾 Save</Text>
              </Pressable>
            </View>
          )}
        </View>

        {[
          { icon: '👤', label: 'Full Name', key: 'name' },
          { icon: '✉', label: 'Email', key: 'email' },
          { icon: '📞', label: 'Phone Number', key: 'phone' },
          { icon: '🛡️', label: 'Department', key: 'department' },
          { icon: '📍', label: 'Location', key: 'location' },
          { icon: '🎫', label: 'Badge Number', key: 'badgeNumber' },
        ].map(field => (
          <View key={field.key} style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldIcon}>{field.icon}</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  (!editing || field.key === 'email') && styles.fieldInputDisabled,
                ]}
                value={form[field.key as keyof typeof form]}
                onChangeText={val => setForm(prev => ({ ...prev, [field.key]: val }))}
                editable={editing && field.key !== 'email'}
                keyboardType={field.key === 'email' ? 'email-address' : 'default'}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Statistics</Text>
        <Text style={styles.cardSub}>Your activity summary</Text>
        <View style={styles.statsGrid}>
          <StatBox value={totalCaptures} label="Total Captures" color="#2563eb" bg="#eff6ff" />
          <StatBox value={violationsFound} label="Violations Found" color="#dc2626" bg="#fef2f2" />
          <StatBox value={32} label="This Month" color="#16a34a" bg="#f0fdf4" />
          <StatBox value="94%" label="Accuracy" color="#7c3aed" bg="#faf5ff" />
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
  value: { fontSize: 24, fontWeight: '800' },
  label: { fontSize: 11, color: '#6b7280', marginTop: 2, textAlign: 'center' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 14, gap: 14, paddingBottom: 30 },
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
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  profileName: { fontSize: 22, fontWeight: '800', color: '#111827' },
  profileEmail: { fontSize: 13, color: '#6b7280' },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleIcon: { fontSize: 13 },
  roleText: { color: '#2563eb', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 12, color: '#9ca3af' },
  editBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editBtnText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: 8 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelBtnText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  saveBtn: {
    backgroundColor: '#2563eb',
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
  fieldIcon: { fontSize: 14 },
  fieldInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
  },
  fieldInputDisabled: { color: '#6b7280' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
