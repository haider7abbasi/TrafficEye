import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AlertButton, AlertButtonStyle } from '../types/alert';
import {
  ACCENT_BLUE,
  ALERT_RED,
  BG_LIGHT_BLUE,
  BG_SECONDARY_BLUE,
  PRIMARY_BLUE,
  SURFACE_PANEL,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TRAFFIC_GOLD,
  WHITE,
} from '../theme/brandColors';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
  onDismiss: () => void;
  onButtonPress: (button: AlertButton) => void;
};

function buttonStyles(style: AlertButtonStyle | undefined, stacked: boolean) {
  const base = stacked ? styles.btnStacked : styles.btnInline;
  if (style === 'destructive') {
    return [base, styles.btnDestructive];
  }
  if (style === 'cancel') {
    return [base, styles.btnCancel];
  }
  return [base, styles.btnPrimary];
}

function buttonLabelStyles(style: AlertButtonStyle | undefined) {
  if (style === 'destructive') {
    return styles.btnLabelDestructive;
  }
  if (style === 'cancel') {
    return styles.btnLabelCancel;
  }
  return styles.btnLabelPrimary;
}

export function TrafficEyeAlertModal({
  visible,
  title,
  message,
  buttons,
  onDismiss,
  onButtonPress,
}: Props) {
  const stacked = buttons.length !== 2;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
      accessibilityViewIsModal>
      <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityLabel="Dismiss alert">
        <Pressable style={styles.card} onPress={e => e.stopPropagation()} accessibilityRole="alert">
          <View style={styles.accent} />
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={[styles.actions, stacked ? styles.actionsStacked : styles.actionsRow]}>
            {buttons.map((button, index) => (
              <Pressable
                key={`${button.text}-${index}`}
                style={({ pressed }) => [
                  ...buttonStyles(button.style, stacked),
                  pressed && styles.btnPressed,
                ]}
                onPress={() => onButtonPress(button)}
                accessibilityRole="button"
                accessibilityLabel={button.text}>
                <Text style={[styles.btnLabel, buttonLabelStyles(button.style)]}>{button.text}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 31, 68, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: SURFACE_PANEL,
    borderRadius: 18,
    paddingTop: 6,
    paddingHorizontal: 22,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: BG_SECONDARY_BLUE,
    shadowColor: '#0A1F44',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  accent: {
    alignSelf: 'center',
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: TRAFFIC_GOLD,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  message: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
  actions: {
    marginTop: 20,
    gap: 10,
  },
  actionsStacked: {
    flexDirection: 'column',
  },
  actionsRow: {
    flexDirection: 'row',
  },
  btnStacked: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  btnInline: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  btnPrimary: {
    backgroundColor: PRIMARY_BLUE,
  },
  btnCancel: {
    backgroundColor: BG_LIGHT_BLUE,
    borderWidth: 1.5,
    borderColor: BG_SECONDARY_BLUE,
  },
  btnDestructive: {
    backgroundColor: '#FDECEC',
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  btnPressed: {
    opacity: 0.88,
  },
  btnLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  btnLabelPrimary: {
    color: WHITE,
  },
  btnLabelCancel: {
    color: ACCENT_BLUE,
  },
  btnLabelDestructive: {
    color: ALERT_RED,
  },
});
