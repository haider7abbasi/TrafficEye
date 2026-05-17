import {
  countRoboflowRawPredictionItems,
  normalizeRoboflowConfidence,
  parseRoboflowDetectPredictions,
  triggersHelmetChallan,
  triggersMobilePhoneChallan,
  triggersPhoneInHandOnly,
  triggersSeatbeltChallan,
} from '../src/services/roboflowViolationPolicy';

describe('roboflowViolationPolicy', () => {
  test('normalizeRoboflowConfidence', () => {
    expect(normalizeRoboflowConfidence(0.88)).toBe(0.88);
    expect(normalizeRoboflowConfidence(88)).toBe(0.88);
    expect(normalizeRoboflowConfidence(150)).toBe(1);
  });

  test('triggersSeatbeltChallan is case-insensitive on class', () => {
    expect(
      triggersSeatbeltChallan(
        [{ class: 'NO-SEATBELT', confidence: 0.9, x: 1, y: 1, width: 2, height: 2 }],
        0.5,
      ),
    ).toBe(true);
  });

  test('triggersHelmetChallan is case-insensitive on class', () => {
    expect(
      triggersHelmetChallan(
        [{ class: 'without helmet', confidence: 0.9, x: 1, y: 1, width: 2, height: 2 }],
        0.5,
      ),
    ).toBe(true);
  });

  test('triggersPhoneInHandOnly', () => {
    expect(
      triggersPhoneInHandOnly(
        [{ class: 'phone_in_hand', confidence: 0.9, x: 1, y: 1, width: 2, height: 2 }],
        0.5,
      ),
    ).toBe(true);
    expect(
      triggersMobilePhoneChallan(
        [{ class: 'phone_in_hand', confidence: 0.9, x: 1, y: 1, width: 2, height: 2 }],
        0.5,
      ),
    ).toBe(false);
  });

  test('parseRoboflowDetectPredictions reads label and normalizes confidence', () => {
    const preds = parseRoboflowDetectPredictions({
      predictions: [{ label: 'car', confidence: 95, x: 0, y: 0, width: 10, height: 10 }],
    });
    expect(preds).toHaveLength(1);
    expect(preds[0].class).toBe('car');
    expect(preds[0].confidence).toBeCloseTo(0.95, 5);
  });

  test('parseRoboflowDetectPredictions coerces string confidence and coordinates', () => {
    const preds = parseRoboflowDetectPredictions({
      predictions: [
        {
          class: 'truck',
          confidence: '0.71',
          x: '100',
          y: '200',
          width: '80',
          height: '60',
        },
      ],
    });
    expect(preds).toHaveLength(1);
    expect(preds[0].class).toBe('truck');
    expect(preds[0].confidence).toBeCloseTo(0.71, 5);
    expect(preds[0].width).toBe(80);
  });

  test('parseRoboflowDetectPredictions reads x_min/y_min/x_max/y_max', () => {
    const preds = parseRoboflowDetectPredictions({
      predictions: [
        {
          label: 'car',
          confidence: 0.9,
          x_min: 0,
          y_min: 0,
          x_max: 100,
          y_max: 50,
        },
      ],
    });
    expect(preds).toHaveLength(1);
    expect(preds[0].x).toBe(50);
    expect(preds[0].y).toBe(25);
    expect(preds[0].width).toBe(100);
    expect(preds[0].height).toBe(50);
  });

  test('parseRoboflowDetectPredictions reads nested bbox', () => {
    const preds = parseRoboflowDetectPredictions({
      predictions: [
        {
          class: 'Bus',
          confidence: 0.55,
          bbox: { x: 10, y: 20, width: 30, height: 40 },
        },
      ],
    });
    expect(preds).toHaveLength(1);
    expect(preds[0].class).toBe('Bus');
    expect(preds[0].width).toBe(30);
  });

  test('parseRoboflowDetectPredictions reads detections array', () => {
    const preds = parseRoboflowDetectPredictions({
      detections: [{ class: 'Motorcycle', confidence: 0.8, x: 1, y: 1, width: 2, height: 2 }],
    });
    expect(preds).toHaveLength(1);
    expect(preds[0].class).toBe('Motorcycle');
  });

  test('countRoboflowRawPredictionItems counts before client filter', () => {
    expect(
      countRoboflowRawPredictionItems({
        predictions: [{ class: 'car', confidence: 0.1, x: 0, y: 0, width: 1, height: 1 }],
      }),
    ).toBe(1);
    expect(countRoboflowRawPredictionItems({ detections: [] })).toBe(0);
  });
});
