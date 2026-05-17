import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { useLoading } from '../context/LoadingContext';
import { mapAuthError } from '../utils/authErrors';
import { RootStackParamList } from '../navigation/RootNavigator';
import { AuthScreenShell, authFormStyles as styles } from '../components/auth/AuthScreenShell';
import { PasswordInput } from '../components/auth/PasswordInput';
import { AlertTriangle, Mail } from 'lucide-react-native';
import { TEXT_MUTED } from '../theme/brandColors';

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
  const { runWithLoading } = useLoading();

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await runWithLoading(
        () => login(email.trim().toLowerCase(), password),
        'Signing in…',
      );
    } catch (e) {
      setError(mapAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const roleBanner =
    roleHint != null ? (
      <View
        style={[
          styles.roleBanner,
          roleHint === 'admin' ? styles.roleBannerAdmin : styles.roleBannerOfficer,
        ]}>
        <Text style={styles.roleBannerText}>
          {roleHint === 'admin' ? 'Administrator portal' : 'Officer portal'}
        </Text>
        <Text style={styles.roleBannerHint}>
          Use the account your organization provided. Your role is confirmed after sign-in.
        </Text>
      </View>
    ) : null;

  return (
    <AuthScreenShell
      onBack={() => navigation.navigate('Welcome')}
      formTitle="Sign in"
      formSubtitle="Enter your credentials to access Traffic Eye."
      headerExtra={roleBanner}>
      {!!error && (
        <View style={styles.errorBox}>
          <View style={styles.errorRow}>
            <AlertTriangle size={16} color="#dc2626" strokeWidth={2.5} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </View>
      )}

      <Text style={styles.label}>Email address</Text>
      <View style={styles.inputRow}>
        <View style={styles.inputIconSlot}>
          <Mail size={18} color={TEXT_MUTED} strokeWidth={2} />
        </View>
        <TextInput
          style={styles.input}
          placeholder="officer@traffic.com"
          placeholderTextColor="#94a3b8"
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
      <PasswordInput
        value={password}
        onChangeText={setPassword}
        returnKeyType="go"
        onSubmitEditing={handleLogin}
      />

      <Pressable
        style={[styles.btn, loading && styles.btnDisabled, styles.btnLast]}
        onPress={handleLogin}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Sign in"
        accessibilityState={{ disabled: loading }}>
        <Text style={styles.btnText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
      </Pressable>

      <View style={styles.helpBox}>
        <Text style={styles.helpTitle}>Need access?</Text>
        <Text style={styles.helpHint}>
          Use the email and password your administrator provided. Contact your supervisor if you do not have
          credentials yet.
        </Text>
      </View>
    </AuthScreenShell>
  );
}
