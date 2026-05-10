import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { TRAFFIC_RULES_COLLECTION } from '../config/collections';
import { useApp } from '../context/AppContext';

type TrafficRule = {
  id: string;
  title: string;
  details: string;
  active: boolean;
};

export function ManageRulesScreen() {
  const { user } = useApp();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TrafficRule[]>([]);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      setLoading(false);
      setItems([]);
      return;
    }

    const unsub = firestore()
      .collection(TRAFFIC_RULES_COLLECTION)
      .orderBy('title', 'asc')
      .onSnapshot(
        snap => {
          const next: TrafficRule[] = [];
          snap.forEach(doc => {
            const data = doc.data();
            next.push({
              id: doc.id,
              title: String(data.title ?? ''),
              details: String(data.details ?? ''),
              active: data.active !== false,
            });
          });
          setItems(next);
          setLoading(false);
        },
        err => {
          console.warn('[Manage rules]', err.message);
          setLoading(false);
        },
      );
    return unsub;
  }, [user?.role]);

  const clearForm = () => {
    setTitle('');
    setDetails('');
    setEditingId(null);
  };

  const validateRule = (): { title: string; details: string } | null => {
    const cleanTitle = title.trim().replace(/\s+/g, ' ');
    const cleanDetails = details.trim();
    if (!cleanTitle || !cleanDetails) {
      Alert.alert('Missing fields', 'Please enter both a title and details.');
      return null;
    }
    if (cleanTitle.length < 4) {
      Alert.alert('Invalid title', 'Rule title must be at least 4 characters.');
      return null;
    }
    if (cleanTitle.length > 80) {
      Alert.alert('Invalid title', 'Rule title must be 80 characters or less.');
      return null;
    }
    if (cleanDetails.length < 10) {
      Alert.alert('Invalid details', 'Rule details must be at least 10 characters.');
      return null;
    }
    if (cleanDetails.length > 500) {
      Alert.alert('Invalid details', 'Rule details must be 500 characters or less.');
      return null;
    }
    const duplicate = items.some(
      r => r.id !== editingId && r.title.trim().toLowerCase() === cleanTitle.toLowerCase(),
    );
    if (duplicate) {
      Alert.alert('Duplicate rule', 'A rule with the same title already exists.');
      return null;
    }
    return { title: cleanTitle, details: cleanDetails };
  };

  const saveRule = async () => {
    const validated = validateRule();
    if (!validated) {
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await firestore().collection(TRAFFIC_RULES_COLLECTION).doc(editingId).set(
          {
            title: validated.title,
            details: validated.details,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      } else {
        await firestore().collection(TRAFFIC_RULES_COLLECTION).add({
          title: validated.title,
          details: validated.details,
          active: true,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }
      clearForm();
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'Failed to save rule.';
      Alert.alert('Save failed', message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: TrafficRule) => {
    try {
      await firestore().collection(TRAFFIC_RULES_COLLECTION).doc(item.id).set(
        {
          active: !item.active,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'Failed to update rule.';
      Alert.alert('Update failed', message);
    }
  };

  const startEdit = (item: TrafficRule) => {
    setEditingId(item.id);
    setTitle(item.title);
    setDetails(item.details);
  };

  const deleteRule = async (item: TrafficRule) => {
    setDeletingId(item.id);
    try {
      await firestore().collection(TRAFFIC_RULES_COLLECTION).doc(item.id).delete();
      if (editingId === item.id) {
        clearForm();
      }
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'Failed to delete rule.';
      Alert.alert('Delete failed', message);
    } finally {
      setDeletingId(null);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Admin Only</Text>
        <Text style={styles.subtle}>You do not have permission to edit traffic rules.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Manage Traffic Rules</Text>
      <Text style={styles.subtle}>Rules shown in app guidance / policy pages.</Text>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingId ? 'Edit rule' : 'Add new rule'}</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Rule title"
          style={styles.input}
          placeholderTextColor="#9ca3af"
        />
        <TextInput
          value={details}
          onChangeText={setDetails}
          placeholder="Rule details"
          style={[styles.input, styles.textArea]}
          placeholderTextColor="#9ca3af"
          multiline
        />
        <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={saveRule} disabled={saving}>
          <Text style={styles.saveText}>
            {saving ? 'Saving...' : editingId ? 'Update rule' : 'Add rule'}
          </Text>
        </Pressable>
        {editingId ? (
          <Pressable style={styles.cancelBtn} onPress={clearForm}>
            <Text style={styles.cancelText}>Cancel edit</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingTop: 10, gap: 10, paddingBottom: 20 }}
        ListEmptyComponent={<Text style={styles.empty}>No rules found.</Text>}
        renderItem={({ item }) => (
          <View style={styles.ruleCard}>
            <Text style={styles.ruleTitle}>{item.title}</Text>
            <Text style={styles.ruleDetails}>{item.details}</Text>
            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.toggleBtn, item.active ? styles.activeBtn : styles.inactiveBtn]}
                onPress={() => toggleActive(item)}>
                <Text style={styles.toggleText}>{item.active ? 'Active' : 'Inactive'}</Text>
              </Pressable>
              <Pressable style={styles.editBtn} onPress={() => startEdit(item)}>
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
              <Pressable
                style={[styles.deleteBtn, deletingId === item.id && styles.saveBtnDisabled]}
                disabled={deletingId === item.id}
                onPress={() =>
                  Alert.alert('Delete rule', `Delete "${item.title}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => void deleteRule(item) },
                  ])
                }>
                <Text style={styles.deleteText}>{deletingId === item.id ? 'Deleting...' : 'Delete'}</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6', padding: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
  heading: { fontSize: 20, fontWeight: '800', color: '#111827' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  subtle: { color: '#6b7280', marginTop: 2 },
  formTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  formCard: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 10,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveText: { color: '#fff', fontWeight: '700' },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 9,
  },
  cancelText: { color: '#4b5563', fontWeight: '600' },
  empty: { marginTop: 16, color: '#6b7280' },
  ruleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  ruleTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  ruleDetails: { fontSize: 12, color: '#4b5563' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  toggleBtn: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  activeBtn: { backgroundColor: '#16a34a' },
  inactiveBtn: { backgroundColor: '#6b7280' },
  toggleText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  editBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#eff6ff',
  },
  editText: { color: '#1d4ed8', fontWeight: '700', fontSize: 12 },
  deleteBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#fef2f2',
  },
  deleteText: { color: '#dc2626', fontWeight: '700', fontSize: 12 },
});
