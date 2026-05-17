import React from 'react';
import { AppScreenBackground } from '../components/AppScreenBackground';

export function withAppScreenBackground<P extends object>(Screen: React.ComponentType<P>): React.ComponentType<P> {
  const baseName = Screen.displayName ?? Screen.name ?? 'Screen';
  /** PascalCase name so React Navigation does not see a minified lowercase `name` (e.g. `t`). */
  function WithAppScreenBackground(props: P) {
    return (
      <AppScreenBackground>
        <Screen {...props} />
      </AppScreenBackground>
    );
  }
  WithAppScreenBackground.displayName = `WithAppScreenBackground(${baseName})`;
  return WithAppScreenBackground;
}
