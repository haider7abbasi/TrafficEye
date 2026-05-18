import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BarChart3,
  Camera,
  Clock,
  FileStack,
  Home,
  ListChecks,
  type LucideIcon,
} from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import type { BottomTabParamList } from './BottomTabNavigator';
import { SHADOW } from '../theme/layout';
import {
  ACCENT_BLUE,
  BG_LIGHT_BLUE,
  BG_SECONDARY_BLUE,
  BRAND_HEADER_BG,
  BRAND_HEADER_BG_DEEP,
  PRIMARY_BLUE,
  SURFACE_PANEL,
  SURFACE_PANEL_BORDER,
  TEXT_MUTED,
  TRAFFIC_GOLD,
  WHITE,
} from '../theme/brandColors';

type TabKey = keyof BottomTabParamList;

type SideTab = {
  route: TabKey;
  label: string;
  Icon: LucideIcon;
};

const OFFICER_LEFT: SideTab[] = [
  { route: 'Capture', label: 'Home', Icon: Home },
  { route: 'Queue', label: 'Queue', Icon: ListChecks },
];

const OFFICER_RIGHT: SideTab[] = [
  { route: 'History', label: 'History', Icon: Clock },
  { route: 'Analytics', label: 'Insights', Icon: BarChart3 },
];

const ADMIN_LEFT: SideTab[] = [
  { route: 'Capture', label: 'Home', Icon: Home },
  { route: 'Queue', label: 'Challans', Icon: FileStack },
];

const ADMIN_RIGHT: SideTab[] = [
  { route: 'History', label: 'History', Icon: Clock },
  { route: 'Analytics', label: 'Insights', Icon: BarChart3 },
];

function SideTabButton({
  tab,
  focused,
  onPress,
}: {
  tab: SideTab;
  focused: boolean;
  onPress: () => void;
}) {
  const Icon = tab.Icon;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.sideTab, focused && styles.sideTabFocused, pressed && styles.tabPressed]}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}>
      {focused ? <View style={styles.indicator} /> : null}
      <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
        <Icon color={focused ? PRIMARY_BLUE : TEXT_MUTED} size={22} strokeWidth={focused ? 2.5 : 2} />
      </View>
      <Text style={[styles.label, focused && styles.labelFocused]} numberOfLines={1}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

export function AppBottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const leftTabs = user?.role === 'admin' ? ADMIN_LEFT : OFFICER_LEFT;
  const rightTabs = user?.role === 'admin' ? ADMIN_RIGHT : OFFICER_RIGHT;
  const activeRoute = state.routes[state.index]?.name as TabKey;
  const captureFocused = activeRoute === 'Capture';

  const goTo = (route: TabKey) => {
    if (route === 'Capture') {
      navigation.navigate({ name: 'Capture', merge: true });
      return;
    }
    navigation.navigate(route);
  };

  const openCameraCapture = () => {
    navigation.navigate({
      name: 'Capture',
      params: { cameraRequestId: Date.now() },
      merge: true,
    });
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.row}>
        <View style={styles.sideGroup}>
          {leftTabs.map(tab => (
            <SideTabButton
              key={tab.route}
              tab={tab}
              focused={activeRoute === tab.route}
              onPress={() => goTo(tab.route)}
            />
          ))}
        </View>

        <View style={styles.centerSlot}>
          <Pressable
            onPress={openCameraCapture}
            style={({ pressed }) => [styles.fab, captureFocused && styles.fabActive, pressed && styles.fabPressed]}
            accessibilityRole="button"
            accessibilityState={{ selected: captureFocused }}
            accessibilityLabel="Capture">
            <View style={[styles.fabInner, captureFocused && styles.fabInnerActive]}>
              <Camera color={WHITE} size={28} strokeWidth={2.5} />
            </View>
            <Text style={[styles.fabLabel, captureFocused && styles.fabLabelActive]} numberOfLines={1}>
              Capture
            </Text>
          </Pressable>
        </View>

        <View style={styles.sideGroup}>
          {rightTabs.map(tab => (
            <SideTabButton
              key={tab.route}
              tab={tab}
              focused={activeRoute === tab.route}
              onPress={() => goTo(tab.route)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const barShadow = Platform.select({
  ios: {
    shadowColor: '#0A1F44',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  default: { elevation: 12 },
});

const fabShadow = Platform.select({
  ios: SHADOW.fab as object,
  default: { elevation: 10 },
});

const styles = StyleSheet.create({
  bar: {
    backgroundColor: SURFACE_PANEL,
    borderTopWidth: 1,
    borderTopColor: SURFACE_PANEL_BORDER,
    paddingTop: 6,
    ...barShadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
  },
  sideGroup: {
    flex: 1,
    flexDirection: 'row',
  },
  sideTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 8,
    paddingBottom: 4,
    gap: 4,
    minHeight: 52,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  sideTabFocused: {
    backgroundColor: BG_LIGHT_BLUE,
  },
  tabPressed: {
    opacity: 0.88,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: ACCENT_BLUE,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: BG_SECONDARY_BLUE,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_MUTED,
    letterSpacing: 0.15,
  },
  labelFocused: {
    color: PRIMARY_BLUE,
    fontWeight: '800',
  },
  centerSlot: {
    width: 88,
    alignItems: 'center',
    marginTop: -22,
    paddingBottom: 2,
  },
  fab: {
    alignItems: 'center',
    gap: 4,
  },
  fabActive: {},
  fabPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  fabInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: BRAND_HEADER_BG,
    borderWidth: 3,
    borderColor: SURFACE_PANEL,
    alignItems: 'center',
    justifyContent: 'center',
    ...fabShadow,
  },
  fabInnerActive: {
    backgroundColor: BRAND_HEADER_BG_DEEP,
    borderColor: TRAFFIC_GOLD,
  },
  fabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_MUTED,
    letterSpacing: 0.15,
  },
  fabLabelActive: {
    color: PRIMARY_BLUE,
    fontWeight: '800',
  },
});
