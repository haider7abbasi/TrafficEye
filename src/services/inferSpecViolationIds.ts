import {
  SPEC_VIOLATION_IDS,
  SPEC_VIOLATION_LABELS,
  type SpecViolationId,
} from '../rules/specViolationMapping';

/** Best-effort map from stored display labels to spec ids (legacy records). */
export function inferSpecViolationIds(violationLabels: string[]): SpecViolationId[] {
  const found = new Set<SpecViolationId>();
  const haystack = violationLabels.join(' ').toLowerCase();
  for (const id of SPEC_VIOLATION_IDS) {
    const label = SPEC_VIOLATION_LABELS[id].toLowerCase();
    if (haystack.includes(label) || haystack.includes(id.replace(/_/g, ' '))) {
      found.add(id);
    }
  }
  if (haystack.includes('seatbelt')) {
    found.add('no_seatbelt');
  }
  if (haystack.includes('helmet')) {
    found.add('no_helmet');
  }
  if (haystack.includes('phone') || haystack.includes('mobile')) {
    found.add('mobile_phone_use');
  }
  return [...found];
}
