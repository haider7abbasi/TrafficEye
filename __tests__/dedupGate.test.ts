import {
  __resetDedupStateForTests,
  buildViolationSignature,
  evaluateDedupGate,
  markChallanConfirmed,
  registerCandidateObservation,
  T_COOLDOWN_MS,
  T_MERGE_MS,
} from '../src/services/dedupGate';

describe('dedupGate', () => {
  beforeEach(() => {
    __resetDedupStateForTests();
  });

  it('builds sorted stable violation signature', () => {
    const sig = buildViolationSignature(['mobile_phone_use', 'no_seatbelt', 'mobile_phone_use']);
    expect(sig).toBe('mobile_phone_use|no_seatbelt');
  });

  it('merges inside T_merge for same session and signature', () => {
    const now = 1_000_000;
    const first = evaluateDedupGate({
      sessionId: 's1',
      violationTypes: ['no_helmet'],
      nowMs: now,
    });
    expect(first.decision).toBe('create');
    registerCandidateObservation({
      sessionId: 's1',
      violationTypes: ['no_helmet'],
      candidateId: 'cand-1',
      nowMs: now,
    });

    const second = evaluateDedupGate({
      sessionId: 's1',
      violationTypes: ['no_helmet'],
      nowMs: now + 20_000,
    });
    expect(second.decision).toBe('merge');
    expect(second.existingCandidateId).toBe('cand-1');
  });

  it('creates again after merge window expires', () => {
    const now = 2_000_000;
    registerCandidateObservation({
      sessionId: 's1',
      violationTypes: ['no_seatbelt'],
      candidateId: 'cand-2',
      nowMs: now,
    });

    const late = evaluateDedupGate({
      sessionId: 's1',
      violationTypes: ['no_seatbelt'],
      nowMs: now + T_MERGE_MS + 1,
    });
    expect(late.decision).toBe('create');
  });

  it('suppresses inside cooldown for same plate + signature', () => {
    const now = 3_000_000;
    markChallanConfirmed({
      plateCanonical: 'ABC123',
      violationTypes: ['mobile_phone_use'],
      confirmedAtMs: now,
    });

    const suppressed = evaluateDedupGate({
      plateCanonical: 'abc123',
      violationTypes: ['mobile_phone_use'],
      nowMs: now + 10_000,
    });
    expect(suppressed.decision).toBe('suppress');

    const afterCooldown = evaluateDedupGate({
      plateCanonical: 'ABC123',
      violationTypes: ['mobile_phone_use'],
      nowMs: now + T_COOLDOWN_MS + 1,
    });
    expect(afterCooldown.decision).toBe('create');
  });
});
