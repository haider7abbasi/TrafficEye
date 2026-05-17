import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { SCRIM_OVER_WATERMARK } from '../theme/brandColors';

const BG = require('../assets/ctp-watermark-bg.png');

type Props = {
  children: React.ReactNode;
};

/**
 * Official watermark with light blue enforcement scrim for readability.
 */
export function AppScreenBackground({ children }: Props) {
  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover" imageStyle={styles.image}>
      <View style={styles.scrim}>{children}</View>
      <View style={styles.waveAccent} pointerEvents="none" />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, width: '100%', height: '100%' },
  image: { opacity: 0.32 },
  scrim: {
    flex: 1,
    backgroundColor: SCRIM_OVER_WATERMARK,
  },
  waveAccent: {
    position: 'absolute',
    bottom: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(0, 87, 184, 0.06)',
  },
});
