import {
  filterPredictionsForDisplay,
  formatModelDetectionsLine,
  topDisplayConfidencePercent,
} from '../src/services/detectionDisplay';
import type { RoboflowPrediction } from '../src/services/roboflowViolationPolicy';

const sample: RoboflowPrediction[] = [
  { class: 'car', confidence: 0.92, x: 10, y: 10, width: 20, height: 20 },
  { class: 'no-seatbelt', confidence: 0.65, x: 10, y: 10, width: 20, height: 20 },
];

describe('detectionDisplay', () => {
  it('filters predictions below display threshold', () => {
    expect(filterPredictionsForDisplay(sample, 0.7)).toHaveLength(1);
    expect(filterPredictionsForDisplay(sample, 0.7)[0].class).toBe('car');
  });

  it('formats line with display threshold message when empty', () => {
    const line = formatModelDetectionsLine('Seatbelt model', sample, 0.95);
    expect(line).toContain('95% display threshold');
  });

  it('computes top visible confidence percent', () => {
    expect(topDisplayConfidencePercent([sample], 0.7)).toBe(92);
    expect(topDisplayConfidencePercent([sample], 0.95)).toBe(0);
  });
});
