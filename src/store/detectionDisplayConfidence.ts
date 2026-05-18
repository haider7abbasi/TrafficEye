import { store } from './configureStore';

/** Settings slider 50–100 → 0.5–1.0 for display filtering. */
export function getDetectionDisplayMinConfidence(): number {
  const pct = store.getState().settings.detectionConfidence;
  if (typeof pct !== 'number' || Number.isNaN(pct)) {
    return 0.75;
  }
  return Math.min(1, Math.max(0.5, pct / 100));
}

export function getDetectionDisplayConfidencePercent(): number {
  return Math.round(getDetectionDisplayMinConfidence() * 100);
}
