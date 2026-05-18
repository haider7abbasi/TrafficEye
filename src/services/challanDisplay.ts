import type { SpecViolationId } from '../rules/specViolationMapping';
import { SPEC_VIOLATION_LABELS } from '../rules/specViolationMapping';

function isSpecViolationId(value: string): value is SpecViolationId {
  return value === 'no_seatbelt' || value === 'no_helmet' || value === 'mobile_phone_use';
}

export function violationLabelsFromIds(ids: string[]): string[] {
  return ids.map(id => (isSpecViolationId(id) ? SPEC_VIOLATION_LABELS[id] : id.replace(/_/g, ' ')));
}

export function formatChallanDate(iso: string): string {
  if (!iso || iso === new Date(0).toISOString()) {
    return '—';
  }
  return new Date(iso).toLocaleString();
}
