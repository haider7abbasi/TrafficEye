import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { useLoading } from '../context/LoadingContext';
import { mapAuthError } from '../utils/authErrors';
import { RootStackParamList } from '../navigation/RootNavigator';
import { AuthScreenShell, authFormStyles as styles } from '../components/auth/AuthScreenShell';
import { PasswordInput } from '../components/auth/PasswordInput';
import { AlertTriangle, Mail, User } from 'lucide-react-native';
import { TEXT_MUTED } from '../theme/brandColors';

type SignupNavigation = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

export function SignupScreen() {
  const navigation = useNavigation<SignupNavigation>();
  const { register } = useApp();
  const { runWithLoading } = useLoading();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password) {
      setError('Please enter name, email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await runWithLoading(() => register(name, email, password), 'Submitting registration…');
    } catch (e) {
      setError(mapAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenShell
      onBack={() => navigation.navigate('Welcome')}
      formTitle="Officer registration"
      formSubtitle="Submit your details to request access. Your administrator will review and approve your profile before you can sign in.">
      {!!error && (
        <View style={styles.errorBox}>
          <View style={styles.errorRow}>
            <AlertTriangle size={16} color="#dc2626" strokeWidth={2.5} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </View>
      )}

      <Text style={styles.label}>Full name</Text>
      <View style={styles.inputRow}>
        <View style={styles.inputIconSlot}>
          <User size={18} color={TEXT_MUTED} strokeWidth={2} />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          placeholderTextColor="#94a3b8"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
        />
      </View>

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
        placeholder="At least 6 characters"
        value={password}
        onChangeText={setPassword}
        autoComplete="password-new"
        textContentType="newPassword"
        returnKeyType="next"
      />

      <Text style={styles.label}>Confirm password</Text>
      <PasswordInput
        placeholder="Re-enter password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        autoComplete="password-new"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleSignup}
      />

      <Pressable
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleSignup}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Submit registration"
        accessibilityState={{ disabled: loading }}>
        <Text style={styles.btnText}>{loading ? 'Submitting…' : 'Submit registration'}</Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Login', {})} hitSlop={8}>
        <Text style={styles.linkText}>
          Already registered? <Text style={styles.linkStrong}>Sign in</Text>
        </Text>
      </Pressable>
    </AuthScreenShell>
  );
}
