/**
 * Class matching is **case-insensitive**; confidence may be 0–1 or 0–100 (normalized when parsing).
 */

/** Default minimum confidence to treat a box as a positive detection */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;

/** Roboflow sometimes returns 0–100; thresholds are 0–1. */
export function normalizeRoboflowConfidence(raw: number): number {
  if (typeof raw !== 'number' || Number.isNaN(raw)) {
    return 0;
  }
  if (raw > 1 && raw <= 100) {
    return Math.min(1, raw / 100);
  }
  if (raw > 100) {
    return 1;
  }
  return Math.max(0, Math.min(1, raw));
}

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

/** Coerce JSON number or numeric string to a finite number. */
function coerceFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value.trim().replace(/,/g, ''));
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return undefined;
}

/**
 * Roboflow detect responses vary: center x/y + w/h on the root, under `bbox`, or as xyxy (`x_min`…`y_max`).
 * Returns pixel box as **center x, center y, width, height** (same convention as the rest of TrafficEye).
 */
function extractPredictionBox(o: Record<string, unknown>): { x: number; y: number; width: number; height: number } | undefined {
  const x0 = coerceFiniteNumber(o.x);
  const y0 = coerceFiniteNumber(o.y);
  const w0 = coerceFiniteNumber(o.width);
  const h0 = coerceFiniteNumber(o.height);
  if (x0 != null && y0 != null && w0 != null && h0 != null && w0 > 0 && h0 > 0) {
    return { x: x0, y: y0, width: w0, height: h0 };
  }

  const bbox = o.bbox;
  if (bbox && typeof bbox === 'object' && !Array.isArray(bbox)) {
    const b = bbox as Record<string, unknown>;
    const bx = coerceFiniteNumber(b.x);
    const by = coerceFiniteNumber(b.y);
    const bw = coerceFiniteNumber(b.width);
    const bh = coerceFiniteNumber(b.height);
    if (bx != null && by != null && bw != null && bh != null && bw > 0 && bh > 0) {
      return { x: bx, y: by, width: bw, height: bh };
    }
  }

  const x1 = coerceFiniteNumber(o.x_min ?? o.xmin);
  const y1 = coerceFiniteNumber(o.y_min ?? o.ymin);
  const x2 = coerceFiniteNumber(o.x_max ?? o.xmax);
  const y2 = coerceFiniteNumber(o.y_max ?? o.ymax);
  if (x1 != null && y1 != null && x2 != null && y2 != null && x2 > x1 && y2 > y1) {
    const width = x2 - x1;
    const height = y2 - y1;
    return { x: x1 + width / 2, y: y1 + height / 2, width, height };
  }

  return undefined;
}

function predictionClassLabel(o: Record<string, unknown>): string | undefined {
  const raw = o.class ?? o.label ?? o.name;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim();
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(raw);
  }
  return undefined;
}

function findPredictionsArray(root: Record<string, unknown>): unknown[] | undefined {
  const top = root.predictions ?? root.detections;
  if (Array.isArray(top)) {
    return top;
  }
  const image = root.image;
  if (image && typeof image === 'object') {
    const img = image as Record<string, unknown>;
    if (Array.isArray(img.predictions)) {
      return img.predictions;
    }
    if (Array.isArray(img.detections)) {
      return img.detections;
    }
  }
  const outputs = root.outputs;
  if (Array.isArray(outputs)) {
    for (const item of outputs) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const nested = (item as Record<string, unknown>).predictions;
      if (Array.isArray(nested)) {
        return nested;
      }
    }
  }
  return undefined;
}

/** How many detection objects Roboflow returned before client-side filtering (debug). */
export function countRoboflowRawPredictionItems(data: unknown): number {
  if (!data || typeof data !== 'object') {
    return 0;
  }
  return findPredictionsArray(data as Record<string, unknown>)?.length ?? 0;
}

/** Parse hosted detect JSON into predictions (best-effort). */
export function parseRoboflowDetectPredictions(data: unknown): RoboflowPrediction[] {
  if (!data || typeof data !== 'object') {
    return [];
  }
  const root = data as Record<string, unknown>;
  const raw = findPredictionsArray(root);
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: RoboflowPrediction[] = [];
  for (const p of raw) {
    if (!p || typeof p !== 'object') {
      continue;
    }
    const o = p as Record<string, unknown>;
    const cls = predictionClassLabel(o);
    const confRaw = o.confidence ?? o.score;
    const confNum = coerceFiniteNumber(confRaw);
    if (!cls || confNum == null) {
      continue;
    }
    const box = extractPredictionBox(o);
    if (!box) {
      continue;
    }
    const conf = normalizeRoboflowConfidence(confNum);
    out.push({ class: cls, confidence: conf, ...box });
  }
  return out;
}

/** Class labels compared case-insensitively (Roboflow exports vary by workspace). */
function classesAboveThreshold(
  predictions: RoboflowPrediction[],
  minConfidence: number,
): Set<string> {
  const set = new Set<string>();
  for (const p of predictions) {
    if (p.confidence >= minConfidence) {
      set.add(p.class.trim().toLowerCase());
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
  return classes.has(SEATBELT_VIOLATION_CLASS.toLowerCase());
}

/** 2. Helmet — fire when `Without Helmet`; ignore `With Helmet` only when no violation class. */
export function triggersHelmetChallan(
  predictions: RoboflowPrediction[],
  minConfidence: number = DEFAULT_CONFIDENCE_THRESHOLD,
): boolean {
  const classes = classesAboveThreshold(predictions, minConfidence);
  return classes.has(HELMET_VIOLATION_CLASS.toLowerCase());
}

/**
 * 3. Mobile phone — fire if ANY of `using_phone`, `calling_phone`, `texting_phone`.
 * `phone_in_hand` alone does NOT fire here (car context uses this strict rule only).
 */
export function triggersMobilePhoneChallan(
  predictions: RoboflowPrediction[],
  minConfidence: number = DEFAULT_CONFIDENCE_THRESHOLD,
): boolean {
  const classes = classesAboveThreshold(predictions, minConfidence);
  for (const c of PHONE_VIOLATION_CLASSES) {
    if (classes.has(c.toLowerCase())) {
      return true;
    }
  }
  return false;
}

/** `phone_in_hand` above threshold (used for motorcycle context only). */
export function triggersPhoneInHandOnly(
  predictions: RoboflowPrediction[],
  minConfidence: number = DEFAULT_CONFIDENCE_THRESHOLD,
): boolean {
  const classes = classesAboveThreshold(predictions, minConfidence);
  return classes.has(PHONE_HAND_ONLY_CLASS.toLowerCase());
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
