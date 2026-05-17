import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { TrafficEyeLoader } from './TrafficEyeLoader';
import { PRIMARY_BLUE, SURFACE_PANEL, TEXT_PRIMARY, TEXT_SECONDARY } from '../theme/brandColors';

type Props = {
  visible: boolean;
  message?: string;
};

/** Full-screen blocking overlay with branded loader. */
export function LoadingOverlay({ visible, message = 'Please wait…' }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent accessibilityViewIsModal>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <TrafficEyeLoader size="large" color={PRIMARY_BLUE} />
          <Text style={styles.title}>{message}</Text>
          <Text style={styles.hint}>This may take a moment on slow networks.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 31, 68, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: SURFACE_PANEL,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  hint: {
    marginTop: 6,
    fontSize: 13,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 18,
  },
});
