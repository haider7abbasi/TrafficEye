import type { EdgeInsets } from 'react-native-safe-area-context';

/** Horizontal padding for History tab list + violation detail (matches HistoryScreen). */
export function historyHorizontalPad(screenWidth: number): number {
  return screenWidth > 500 ? 24 : 14;
}

/** Scroll content insets shared by History list and violation detail (tab content only; tab bar handles bottom inset). */
export function historyScrollContentPadding(
  insets: EdgeInsets,
  screenWidth: number,
  options?: { includeTopSafeArea?: boolean },
): {
  paddingHorizontal: number;
  paddingTop: number;
  paddingBottom: number;
} {
  const includeTop = options?.includeTopSafeArea ?? false;
  return {
    paddingHorizontal: historyHorizontalPad(screenWidth),
    paddingTop: (includeTop ? insets.top : 0) + 8,
    paddingBottom: 24,
  };
}
