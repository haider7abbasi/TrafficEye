import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrafficEyeLoader } from './TrafficEyeLoader';
import { TrafficEyeLogo } from './TrafficEyeLogo';
import {
  BRAND_HEADER_BG,
  BRAND_HEADER_BG_DEEP,
  BRAND_ON_PRIMARY_MUTED,
  BRAND_ON_PRIMARY_SUBTLE,
} from '../theme/brandColors';

type Props = {
  message: string;
};

/**
 * Full-screen branded splash (auth bootstrap, persist rehydrate).
 */
export function TrafficEyeSplashScreen({ message }: Props) {
  const heroOpacity = useSharedValue(0);
  const heroTranslateY = useSharedValue(12);
  const statusOpacity = useSharedValue(0);

  useEffect(() => {
    heroOpacity.value = withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) });
    heroTranslateY.value = withTiming(0, { duration: 480, easing: Easing.out(Easing.cubic) });
    statusOpacity.value = withDelay(220, withTiming(1, { duration: 360 }));
  }, [heroOpacity, heroTranslateY, statusOpacity]);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ translateY: heroTranslateY.value }],
  }));

  const statusStyle = useAnimatedStyle(() => ({
    opacity: statusOpacity.value,
  }));

  return (
    <View style={styles.root} accessibilityLabel="Loading Traffic Eye">
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <Animated.View style={[styles.hero, heroStyle]}>
          <TrafficEyeLogo size={112} style={styles.logo} />
          <Text style={styles.brandTitle}>Traffic Eye</Text>
          <Text style={styles.brandTagline}>Smart traffic enforcement</Text>
        </Animated.View>

        <Animated.View style={[styles.statusBlock, statusStyle]}>
          <TrafficEyeLoader size="medium" color="#ffffff" ringColor={BRAND_ON_PRIMARY_MUTED} />
          <View style={styles.messagePill}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        </Animated.View>

        <Text style={styles.footer}>AI traffic enforcement · Secure government platform</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND_HEADER_BG,
  },
  glowTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -100,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: BRAND_HEADER_BG_DEEP,
    opacity: 0.55,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
  },
  logo: {
    marginBottom: 22,
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  brandTagline: {
    color: BRAND_ON_PRIMARY_SUBTLE,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  statusBlock: {
    alignItems: 'center',
    gap: 18,
    paddingBottom: 8,
  },
  messagePill: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    maxWidth: '100%',
  },
  messageText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    color: BRAND_ON_PRIMARY_MUTED,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    paddingBottom: 8,
    opacity: 0.95,
  },
});
