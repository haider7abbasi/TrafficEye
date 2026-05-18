import type { User } from '../context/AppContext';

/** Pending = no challan issued yet. */
export function isPendingViolationRecord(challanId?: string | null): boolean {
  return !challanId;
}

/**
 * Pending records: officer or admin may delete.
 * Issued challan records: admin only.
 */
export function canDeleteViolationRecord(
  user: Pick<User, 'role'> | null | undefined,
  challanId?: string | null,
): boolean {
  if (!user) {
    return false;
  }
  if (isPendingViolationRecord(challanId)) {
    return user.role === 'officer' || user.role === 'admin';
  }
  return user.role === 'admin';
}
