import { Platform, StyleSheet, type ViewStyle } from 'react-native';
import {
  ACCENT_BLUE,
  ALERT_RED,
  BG_LIGHT_BLUE,
  BG_SECONDARY_BLUE,
  NAVY_TEXT,
  PRIMARY_BLUE,
  SURFACE_PANEL,
  SURFACE_PANEL_BORDER,
  TEXT_MUTED,
  WHITE,
} from './brandColors';

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  pill: 999,
} as const;

export const SHADOW = Platform.select({
  ios: {
    card: {
      shadowColor: NAVY_TEXT,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    fab: {
      shadowColor: PRIMARY_BLUE,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 10,
    },
  },
  default: {
    card: { elevation: 3 },
    fab: { elevation: 8 },
  },
}) ?? { card: {}, fab: { elevation: 8 } };

export const layoutStyles = StyleSheet.create({
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: NAVY_TEXT,
    letterSpacing: 0.2,
  },
  pageSubtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: SURFACE_PANEL,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
    padding: 16,
    marginBottom: 14,
    ...(SHADOW.card as object),
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: NAVY_TEXT,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginBottom: 12,
  },
  btnPrimary: {
    backgroundColor: PRIMARY_BLUE,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...(SHADOW.card as object),
  },
  btnPrimaryText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '800',
  },
  btnDanger: {
    backgroundColor: ALERT_RED,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDangerText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
  btnOutline: {
    backgroundColor: WHITE,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: ACCENT_BLUE,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnOutlineText: {
    color: ACCENT_BLUE,
    fontSize: 15,
    fontWeight: '700',
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: BG_LIGHT_BLUE,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: PRIMARY_BLUE,
  },
});

export function glassCard(extra?: ViewStyle): ViewStyle {
  return {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: BG_SECONDARY_BLUE,
    ...(SHADOW.card as object),
    ...extra,
  };
}
