/**
 * Maps Roboflow class names to TrafficEye challan triggers and plate crop (Option 1).
 * Class strings must match your Roboflow model labels exactly (case-sensitive).
 */

/** Default minimum confidence to treat a box as a positive detection */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;

export type RoboflowPrediction = {
  class: string;
  confidence: number;
  /** Center x in pixels (Roboflow hosted detect convention) */
  x: number;
  /** Center y in pixels */
  y: number;
  width: number;
  height: number;
};

export const SEATBELT_VIOLATION_CLASS = 'no-seatbelt';
export const SEATBELT_COMPLIANT_CLASS = 'seatbelt';

export const HELMET_VIOLATION_CLASS = 'Without Helmet';
export const HELMET_COMPLIANT_CLASS = 'With Helmet';

export const PHONE_VIOLATION_CLASSES = [
  'using_phone',
  'calling_phone',
  'texting_phone',
] as const;

/** Ignored unless one of {@link PHONE_VIOLATION_CLASSES} is also present */
export const PHONE_HAND_ONLY_CLASS = 'phone_in_hand';

/** Parse hosted detect JSON into predictions (best-effort). */
export function parseRoboflowDetectPredictions(data: unknown): RoboflowPrediction[] {
  if (!data || typeof data !== 'object') {
    return [];
  }
  const raw = (data as { predictions?: unknown }).predictions;
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: RoboflowPrediction[] = [];
  for (const p of raw) {
    if (!p || typeof p !== 'object') {
      continue;
    }
    const o = p as Record<string, unknown>;
    const cls = o.class;
    const conf = o.confidence;
    const x = o.x;
    const y = o.y;
    const w = o.width;
    const h = o.height;
    if (typeof cls !== 'string' || typeof conf !== 'number') {
      continue;
    }
    if (typeof x !== 'number' || typeof y !== 'number' || typeof w !== 'number' || typeof h !== 'number') {
      continue;
    }
    out.push({ class: cls, confidence: conf, x, y, width: w, height: h });
  }
  return out;
}

function classesAboveThreshold(
  predictions: RoboflowPrediction[],
  minConfidence: number,
): Set<string> {
  const set = new Set<string>();
  for (const p of predictions) {
    if (p.confidence >= minConfidence) {
      set.add(p.class);
    }
  }
  return set;
}

/** 1. Seatbelt — fire when `no-seatbelt`; ignore compliant `seatbelt` only (violation wins if both). */
export function triggersSeatbeltChallan(
  predictions: RoboflowPrediction[],
  minConfidence: number = DEFAULT_CONFIDENCE_THRESHOLD,
): boolean {
  const classes = classesAboveThreshold(predictions, minConfidence);
  return classes.has(SEATBELT_VIOLATION_CLASS);
}

/** 2. Helmet — fire when `Without Helmet`; ignore `With Helmet` only when no violation class. */
export function triggersHelmetChallan(
  predictions: RoboflowPrediction[],
  minConfidence: number = DEFAULT_CONFIDENCE_THRESHOLD,
): boolean {
  const classes = classesAboveThreshold(predictions, minConfidence);
  return classes.has(HELMET_VIOLATION_CLASS);
}

/**
 * 3. Mobile phone — fire if ANY of `using_phone`, `calling_phone`, `texting_phone`.
 * `phone_in_hand` alone does NOT fire; it may appear alongside a violation class.
 */
export function triggersMobilePhoneChallan(
  predictions: RoboflowPrediction[],
  minConfidence: number = DEFAULT_CONFIDENCE_THRESHOLD,
): boolean {
  const classes = classesAboveThreshold(predictions, minConfidence);
  for (const c of PHONE_VIOLATION_CLASSES) {
    if (classes.has(c)) {
      return true;
    }
  }
  return false;
}

export type PixelCropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Convert Roboflow box (center x,y + size) to top-left crop rect in pixels, clamped to image bounds.
 */
export function predictionToPixelCropRect(
  pred: RoboflowPrediction,
  imageWidth: number,
  imageHeight: number,
): PixelCropRect {
  const halfW = pred.width / 2;
  const halfH = pred.height / 2;
  let x = Math.round(pred.x - halfW);
  let y = Math.round(pred.y - halfH);
  let w = Math.round(pred.width);
  let h = Math.round(pred.height);

  x = Math.max(0, Math.min(x, imageWidth - 1));
  y = Math.max(0, Math.min(y, imageHeight - 1));
  w = Math.max(1, Math.min(w, imageWidth - x));
  h = Math.max(1, Math.min(h, imageHeight - y));

  return { x, y, width: w, height: h };
}

/**
 * 4. Number plate — Option 1: pick best plate box for crop; officer types plate text in UI.
 * Uses the highest-confidence prediction from the plate model run (all boxes assumed plate-relevant).
 */
export function selectPrimaryPlatePrediction(
  predictions: RoboflowPrediction[],
  minConfidence: number = DEFAULT_CONFIDENCE_THRESHOLD,
): RoboflowPrediction | null {
  const viable = predictions.filter((p) => p.confidence >= minConfidence);
  if (viable.length === 0) {
    return null;
  }
  return viable.reduce((a, b) => (a.confidence >= b.confidence ? a : b));
}
