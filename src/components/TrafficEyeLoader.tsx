import React, { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Shield } from 'lucide-react-native';
import { BRAND_HEADER_BG, TEXT_MUTED } from '../theme/brandColors';

export type TrafficEyeLoaderSize = 'small' | 'medium' | 'large';

const SIZE_MAP: Record<TrafficEyeLoaderSize, { outer: number; icon: number; stroke: number }> = {
  small: { outer: 36, icon: 16, stroke: 2 },
  medium: { outer: 56, icon: 24, stroke: 2.2 },
  large: { outer: 72, icon: 30, stroke: 2.4 },
};

type Props = {
  size?: TrafficEyeLoaderSize;
  color?: string;
  ringColor?: string;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Branded spinner: rotating ring + shield mark (TrafficEye green).
 */
export function TrafficEyeLoader({
  size = 'medium',
  color = BRAND_HEADER_BG,
  ringColor,
  label,
  style,
}: Props) {
  const dims = SIZE_MAP[size];
  const ring = ringColor ?? color;
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1100, easing: Easing.linear }),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulse, rotation]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const ringWidth = Math.max(3, Math.round(dims.outer * 0.07));

  return (
    <View style={[styles.wrap, style]} accessibilityRole="progressbar" accessibilityLabel={label ?? 'Loading'}>
      <View style={{ width: dims.outer, height: dims.outer }}>
        <Animated.View
          style={[
            styles.ring,
            ringStyle,
            {
              width: dims.outer,
              height: dims.outer,
              borderRadius: dims.outer / 2,
              borderWidth: ringWidth,
              borderColor: ring,
              borderTopColor: 'transparent',
              borderRightColor: 'transparent',
            },
          ]}
        />
        <Animated.View
          style={[
            styles.core,
            coreStyle,
            {
              width: dims.outer * 0.62,
              height: dims.outer * 0.62,
              borderRadius: (dims.outer * 0.62) / 2,
              backgroundColor: `${color}18`,
            },
          ]}>
          <Shield size={dims.icon} color={color} strokeWidth={dims.stroke} />
        </Animated.View>
      </View>
      {label ? <Text style={[styles.label, { color: TEXT_MUTED }]}>{label}</Text> : null}
    </View>
  );
}

/** Centered loader for full-screen fetch states. */
export function ScreenLoadingCenter({
  message = 'Loading…',
  size = 'large',
}: {
  message?: string;
  size?: TrafficEyeLoaderSize;
}) {
  return (
    <View style={styles.screenCenter}>
      <TrafficEyeLoader size={size} label={message} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  core: {
    position: 'absolute',
    top: '19%',
    left: '19%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 260,
  },
  screenCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
