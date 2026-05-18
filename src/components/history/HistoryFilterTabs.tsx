import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BadgeCheck, Clock } from 'lucide-react-native';
import {
  PRIMARY_BLUE,
  SURFACE_PANEL,
  SURFACE_PANEL_BORDER,
  TEXT_MUTED,
  WHITE,
} from '../../theme/brandColors';

export type HistoryFilterTab = 'pending' | 'issued';

type Props = {
  active: HistoryFilterTab;
  pendingCount: number;
  issuedCount: number;
  onChange: (tab: HistoryFilterTab) => void;
};

const TABS: { id: HistoryFilterTab; label: string; Icon: typeof Clock }[] = [
  { id: 'pending', label: 'Pending', Icon: Clock },
  { id: 'issued', label: 'Issued', Icon: BadgeCheck },
];

export function HistoryFilterTabs({ active, pendingCount, issuedCount, onChange }: Props) {
  const counts: Record<HistoryFilterTab, number> = {
    pending: pendingCount,
    issued: issuedCount,
  };

  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {TABS.map(({ id, label, Icon }) => {
        const selected = active === id;
        const count = counts[id];
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            style={[styles.tab, selected && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${label}, ${count} records`}>
            <Icon size={17} color={selected ? WHITE : TEXT_MUTED} strokeWidth={2.2} />
            <Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>{label}</Text>
            <View style={[styles.countBadge, selected && styles.countBadgeActive]}>
              <Text style={[styles.countText, selected && styles.countTextActive]}>{count}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: SURFACE_PANEL,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SURFACE_PANEL_BORDER,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: 9,
    paddingHorizontal: 8,
  },
  tabActive: {
    backgroundColor: PRIMARY_BLUE,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_MUTED,
  },
  tabLabelActive: {
    color: WHITE,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 87, 184, 0.12)',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: PRIMARY_BLUE,
  },
  countTextActive: {
    color: WHITE,
  },
});
