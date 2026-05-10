import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type WelcomeNav = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

type RoleTileProps = {
  title: string;
  subtitle: string;
  backgroundColor: string;
  onSignIn: () => void;
  tileStyle?: object;
};

function RoleTile({ title, subtitle, backgroundColor, onSignIn, tileStyle }: RoleTileProps) {
  return (
    <View style={[styles.tile, { backgroundColor }, tileStyle]}>
      <View style={styles.tileTextBlock}>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={styles.tileSubtitle}>{subtitle}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.tileSignInBtn, pressed && styles.tileSignInBtnPressed]}
        onPress={onSignIn}
        accessibilityRole="button"
        accessibilityLabel={`Sign in as ${title}`}>
        <Text style={styles.tileSignInBtnText}>Sign In</Text>
      </Pressable>
    </View>
  );
}

export function WelcomeScreen() {
  const navigation = useNavigation<WelcomeNav>();
  const { width } = useWindowDimensions();
  const useSideBySide = width >= 360;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces>
        <View style={styles.brandRow}>
          <Text style={styles.brandIcon}>🛡️</Text>
          <View>
            <Text style={styles.brandTitle}>TrafficEye</Text>
            <Text style={styles.brandSub}>Violation detection</Text>
          </View>
        </View>

        <Text style={styles.instructions}>Choose how you sign in</Text>

        <View style={[styles.grid, useSideBySide ? styles.gridRow : styles.gridColumn]}>
          <RoleTile
            title="Officer"
            subtitle="Scan scenes, review candidates, manage challans"
            backgroundColor="#1e3a8a"
            onSignIn={() => navigation.navigate('Login', { roleHint: 'officer' })}
            tileStyle={useSideBySide ? styles.tileHalf : styles.tileFull}
          />
          <RoleTile
            title="Admin"
            subtitle="Approve officers, rules, and all-challan views"
            backgroundColor="#475569"
            onSignIn={() => navigation.navigate('Login', { roleHint: 'admin' })}
            tileStyle={useSideBySide ? styles.tileHalf : styles.tileFull}
          />
        </View>

        <View style={styles.newAccountCard}>
          <Text style={styles.newAccountTitle}>New account</Text>
          <Text style={styles.newAccountDesc}>
            Register as an officer. An administrator must approve you before you can use the app.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.newAccountBtn, pressed && styles.newAccountBtnPressed]}
            onPress={() => navigation.navigate('Signup')}
            accessibilityRole="button"
            accessibilityLabel="Create new account">
            <Text style={styles.newAccountBtnText}>Create account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#e2e8f0',
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    marginTop: 8,
  },
  brandIcon: { fontSize: 36 },
  brandTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  brandSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  instructions: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 14,
  },
  grid: {
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  gridColumn: {
    flexDirection: 'column',
  },
  tile: {
    borderRadius: 4,
    paddingVertical: 28,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    minHeight: 168,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tileHalf: {
    flex: 1,
  },
  tileFull: {
    width: '100%',
  },
  tileTextBlock: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  tileTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  tileSubtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 4,
  },
  tileSignInBtn: {
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: 6,
    minWidth: 160,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tileSignInBtnPressed: {
    opacity: 0.92,
  },
  tileSignInBtnText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  newAccountCard: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  newAccountTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  newAccountDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
    marginBottom: 16,
  },
  newAccountBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  newAccountBtnPressed: { opacity: 0.9 },
  newAccountBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
