/**
 * Root `App` is not mounted here: it pulls native TurboModules (gesture handler, Firebase, etc.)
 * that are not available in the Jest environment. Smoke-test the real app with `npm run android`.
 */
import { normalizePlateForDisplay } from '../src/rules/plateNormalization';

test('jest baseline (pure TS, no native modules)', () => {
  expect(normalizePlateForDisplay('  abc-1234  ')).toBe('ABC 1234');
});
