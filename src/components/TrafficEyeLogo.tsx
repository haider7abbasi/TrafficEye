import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const LOGO_SOURCE = require('../assets/logo.png');

export type TrafficEyeLogoProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
};

/** Transparent PNG brand mark — use instead of generic shield icons for branding. */
export function TrafficEyeLogo({
  size = 48,
  style,
  imageStyle,
  accessibilityLabel = 'Traffic Eye logo',
}: TrafficEyeLogoProps) {
  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      <Image
        source={LOGO_SOURCE}
        style={[styles.image, { width: size, height: size }, imageStyle]}
        resizeMode="contain"
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    backgroundColor: 'transparent',
  },
});
