import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { OverlayLayout } from '../../services/detectionDisplay';

type Props = {
  layouts: OverlayLayout[];
};

export function DetectionPreviewOverlays({ layouts }: Props) {
  if (layouts.length === 0) {
    return null;
  }
  return (
    <>
      {layouts.map((box, i) => (
        <View
          key={`${box.label}-${i}`}
          pointerEvents="none"
          style={[
            styles.box,
            {
              left: box.left,
              top: box.top,
              width: box.width,
              height: box.height,
              borderColor: box.borderColor,
            },
          ]}>
          <View style={[styles.labelWrap, { backgroundColor: box.borderColor }]}>
            <Text style={styles.label} numberOfLines={1}>
              {box.label}
            </Text>
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  labelWrap: {
    position: 'absolute',
    left: -1,
    top: -18,
    maxWidth: 140,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
});
