import type { RoboflowPrediction } from '../services/roboflowViolationPolicy';
import {
  HELMET_COMPLIANT_CLASS,
  HELMET_VIOLATION_CLASS,
  PHONE_HAND_ONLY_CLASS,
  PHONE_VIOLATION_CLASSES,
  SEATBELT_COMPLIANT_CLASS,
  SEATBELT_VIOLATION_CLASS,
  triggersHelmetChallan,
  triggersMobilePhoneChallan,
  triggersSeatbeltChallan,
} from '../services/roboflowViolationPolicy';

/** Stable ids stored on challans / Firestore (Roboflow-agnostic). */
export type SpecViolationId = 'no_seatbelt' | 'no_helmet' | 'mobile_phone_use';

export const SPEC_VIOLATION_IDS: readonly SpecViolationId[] = [
  'mobile_phone_use',
  'no_helmet',
  'no_seatbelt',
];

export const SPEC_VIOLATION_LABELS: Record<SpecViolationId, string> = {
  no_seatbelt: 'Not wearing seatbelt',
  no_helmet: 'Riding without helmet',
  mobile_phone_use: 'Mobile phone use while driving',
};

/** Class label ↔ spec violation mapping (must match Roboflow exports). */
export const ROBOFLOW_CLASS_SPEC_SHEET: readonly {
  roboflowClass: string;
  specViolationId: SpecViolationId | null;
  role: 'violation' | 'compliant' | 'context' | 'plate_detection';
  note: string;
}[] = [
  {
    roboflowClass: SEATBELT_VIOLATION_CLASS,
    specViolationId: 'no_seatbelt',
    role: 'violation',
    note: 'Triggers challan when above confidence threshold.',
  },
  {
    roboflowClass: SEATBELT_COMPLIANT_CLASS,
    specViolationId: null,
    role: 'compliant',
    note: 'Does not trigger; ignored if no-seatbelt also present.',
  },
  {
    roboflowClass: HELMET_VIOLATION_CLASS,
    specViolationId: 'no_helmet',
    role: 'violation',
    note: 'Triggers challan when above threshold.',
  },
  {
    roboflowClass: HELMET_COMPLIANT_CLASS,
    specViolationId: null,
    role: 'compliant',
    note: 'Does not trigger alone.',
  },
  ...PHONE_VIOLATION_CLASSES.map(c => ({
    roboflowClass: c,
    specViolationId: 'mobile_phone_use' as const,
    role: 'violation' as const,
    note: 'Any of these classes triggers the same spec violation id.',
  })),
  {
    roboflowClass: PHONE_HAND_ONLY_CLASS,
    specViolationId: null,
    role: 'context',
    note: 'Never triggers a challan by itself.',
  },
  {
    roboflowClass: '(number plate model)',
    specViolationId: null,
    role: 'plate_detection',
    note: 'Bounding box only; officer enters plate text (Option 1).',
  },
];

export function specViolationLabel(id: SpecViolationId): string {
  return SPEC_VIOLATION_LABELS[id];
}

/** Map a single Roboflow class string to a spec violation id, if any. */
export function resolveRoboflowClassToSpecViolationId(className: string): SpecViolationId | null {
  const row = ROBOFLOW_CLASS_SPEC_SHEET.find(r => r.roboflowClass === className);
  return row?.specViolationId ?? null;
}

/**
 * Spec violation ids to attach to a candidate / challan for one frame,
 * from merged Roboflow predictions (all models), using policy thresholds.
 */
export function collectSpecViolationIdsFromPredictions(
  predictions: RoboflowPrediction[],
  minConfidence: number,
): SpecViolationId[] {
  const out: SpecViolationId[] = [];
  if (triggersSeatbeltChallan(predictions, minConfidence)) {
    out.push('no_seatbelt');
  }
  if (triggersHelmetChallan(predictions, minConfidence)) {
    out.push('no_helmet');
  }
  if (triggersMobilePhoneChallan(predictions, minConfidence)) {
    out.push('mobile_phone_use');
  }
  return [...new Set(out)];
}
