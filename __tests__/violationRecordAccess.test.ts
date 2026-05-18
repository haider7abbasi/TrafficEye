import { canDeleteViolationRecord, isPendingViolationRecord } from '../src/utils/violationRecordAccess';

describe('violationRecordAccess', () => {
  it('treats records without challan as pending', () => {
    expect(isPendingViolationRecord(undefined)).toBe(true);
    expect(isPendingViolationRecord(null)).toBe(true);
    expect(isPendingViolationRecord('chal-1')).toBe(false);
  });

  it('allows officer and admin to delete pending records', () => {
    expect(canDeleteViolationRecord({ role: 'officer' }, undefined)).toBe(true);
    expect(canDeleteViolationRecord({ role: 'admin' }, undefined)).toBe(true);
  });

  it('allows only admin to delete issued challan records', () => {
    expect(canDeleteViolationRecord({ role: 'officer' }, 'chal-123')).toBe(false);
    expect(canDeleteViolationRecord({ role: 'admin' }, 'chal-123')).toBe(true);
  });

  it('denies delete when user is missing', () => {
    expect(canDeleteViolationRecord(null, undefined)).toBe(false);
  });
});
