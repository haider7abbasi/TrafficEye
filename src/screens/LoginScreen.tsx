import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { mapAuthError } from '../utils/authErrors';
import { RootStackParamList } from '../navigation/RootNavigator';

type LoginNavigation = NativeStackNavigationProp<RootStackParamList, 'Login'>;
type LoginRoute = RouteProp<RootStackParamList, 'Login'>;

export function LoginScreen() {
  const navigation = useNavigation<LoginNavigation>();
  const route = useRoute<LoginRoute>();
  const roleHint = route.params?.roleHint;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useApp();

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e) {
      setError(mapAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable
          style={styles.backRow}
          onPress={() => navigation.navigate('Welcome')}
          accessibilityRole="button"
          accessibilityLabel="Back to role selection">
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backText}>Choose role</Text>
        </Pressable>

        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>🛡️</Text>
          </View>
          <Text style={styles.logoTitle}>Traffic Violation</Text>
          <Text style={styles.logoSub}>Detection System</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          {roleHint ? (
            <View
              style={[styles.roleBanner, roleHint === 'admin' ? styles.roleBannerAdmin : styles.roleBannerOfficer]}>
              <Text style={styles.roleBannerText}>
                {roleHint === 'admin' ? 'Administrator portal' : 'Officer portal'}
              </Text>
              <Text style={styles.roleBannerHint}>
                Use the account your organization provided. Your role is confirmed after sign-in.
              </Text>
            </View>
          ) : null}

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          )}

          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputIcon}>✉</Text>
            <TextInput
              style={styles.input}
              placeholder="officer@traffic.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
          </View>

          <Pressable
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            accessibilityState={{ disabled: loading }}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Signup')} hitSlop={8}>
            <Text style={styles.linkText}>
              Need an account? <Text style={styles.linkStrong}>Create account</Text>
            </Text>
          </Pressable>

          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>First time here?</Text>
            <Text style={styles.demoHint}>
              Use the email and password your administrator gave you, or tap Create account if self-sign-up is
              enabled for your organization.
            </Text>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2563eb' },
  keyboard: { flex: 1 },
  scroll: { flexGrow: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 6,
    paddingRight: 12,
    gap: 2,
  },
  backChevron: { color: '#e0e7ff', fontSize: 28, fontWeight: '300', marginTop: -2 },
  backText: { color: '#e0e7ff', fontSize: 15, fontWeight: '600' },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoIcon: { fontSize: 36 },
  logoTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },
  logoSub: { color: '#bfdbfe', fontSize: 14, marginTop: 4 },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 18 },
  roleBanner: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  roleBannerOfficer: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  roleBannerAdmin: {
    backgroundColor: '#f1f5f9',
    borderColor: '#94a3b8',
  },
  roleBannerText: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  roleBannerHint: { fontSize: 12, color: '#475569', lineHeight: 17 },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: { color: '#dc2626', fontSize: 13 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#f9fafb',
  },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, color: '#111827', fontSize: 14 },
  btn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
    minHeight: 48,
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.85 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkText: {
    textAlign: 'center',
    color: '#4b5563',
    fontSize: 13,
    marginBottom: 16,
  },
  linkStrong: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  demoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 4,
  },
  demoTitle: { fontSize: 11, fontWeight: '700', color: '#1e40af', marginBottom: 4 },
  demoHint: { fontSize: 11, color: '#1d4ed8', lineHeight: 16 },
});
