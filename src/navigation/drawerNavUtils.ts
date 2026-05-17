import type { NavigationState } from '@react-navigation/native';

/** Deepest focused route name (e.g. Capture under MainTabs). */
export function getFocusedLeafRouteName(state: NavigationState | undefined): string | undefined {
  if (!state || state.index == null) {
    return undefined;
  }
  const route = state.routes[state.index];
  if (!route) {
    return undefined;
  }
  if (route.state) {
    return getFocusedLeafRouteName(route.state as NavigationState);
  }
  return route.name;
}
