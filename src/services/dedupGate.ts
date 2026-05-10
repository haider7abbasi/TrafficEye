import type { SpecViolationId } from '../rules/specViolationMapping';

export type DedupDecision = 'create' | 'merge' | 'suppress';

export type DedupGateInput = {
  sessionId?: string;
  plateCanonical?: string;
  violationTypes: SpecViolationId[];
  nowMs?: number;
};

export const T_MERGE_MS = 60_000;
export const T_COOLDOWN_MS = 90_000;

type CandidateObservation = {
  candidateId: string;
  lastSeenMs: number;
};

const mergeBySessionSignature = new Map<string, CandidateObservation>();
const suppressUntilByPlateSignature = new Map<string, number>();

export type DedupEvaluation = {
  decision: DedupDecision;
  violationSignature: string;
  existingCandidateId?: string;
  reason: string;
};

function mergeKey(sessionId: string, signature: string): string {
  return `${sessionId}::${signature}`;
}

function suppressKey(plateCanonical: string, signature: string): string {
  return `${plateCanonical}::${signature}`;
}

function cleanExpired(nowMs: number): void {
  for (const [k, v] of suppressUntilByPlateSignature.entries()) {
    if (v <= nowMs) {
      suppressUntilByPlateSignature.delete(k);
    }
  }
  for (const [k, obs] of mergeBySessionSignature.entries()) {
    if (nowMs - obs.lastSeenMs > T_MERGE_MS) {
      mergeBySessionSignature.delete(k);
    }
  }
}

export function buildViolationSignature(violationTypes: SpecViolationId[]): string {
  return [...new Set(violationTypes)].sort().join('|');
}

export function evaluateDedupGate(input: DedupGateInput): DedupEvaluation {
  const nowMs = input.nowMs ?? Date.now();
  cleanExpired(nowMs);
  const violationSignature = buildViolationSignature(input.violationTypes);
  if (!violationSignature) {
    return {
      decision: 'suppress',
      violationSignature,
      reason: 'empty_signature',
    };
  }

  const plateCanonical = input.plateCanonical?.trim().toUpperCase();
  if (plateCanonical) {
    const until = suppressUntilByPlateSignature.get(suppressKey(plateCanonical, violationSignature));
    if (until && nowMs < until) {
      return {
        decision: 'suppress',
        violationSignature,
        reason: 'cooldown_active',
      };
    }
  }

  const sessionId = input.sessionId?.trim();
  if (sessionId) {
    const k = mergeKey(sessionId, violationSignature);
    const obs = mergeBySessionSignature.get(k);
    if (obs && nowMs - obs.lastSeenMs <= T_MERGE_MS) {
      return {
        decision: 'merge',
        violationSignature,
        existingCandidateId: obs.candidateId,
        reason: 'merge_window',
      };
    }
  }

  return {
    decision: 'create',
    violationSignature,
    reason: 'new_signature',
  };
}

export function registerCandidateObservation(input: {
  sessionId?: string;
  violationTypes: SpecViolationId[];
  candidateId: string;
  nowMs?: number;
}): void {
  const sessionId = input.sessionId?.trim();
  if (!sessionId) {
    return;
  }
  const nowMs = input.nowMs ?? Date.now();
  const signature = buildViolationSignature(input.violationTypes);
  if (!signature) {
    return;
  }
  mergeBySessionSignature.set(mergeKey(sessionId, signature), {
    candidateId: input.candidateId,
    lastSeenMs: nowMs,
  });
}

export function markChallanConfirmed(input: {
  plateCanonical: string;
  violationTypes: SpecViolationId[];
  confirmedAtMs?: number;
}): void {
  const plateCanonical = input.plateCanonical.trim().toUpperCase();
  const signature = buildViolationSignature(input.violationTypes);
  if (!plateCanonical || !signature) {
    return;
  }
  const confirmedAtMs = input.confirmedAtMs ?? Date.now();
  suppressUntilByPlateSignature.set(
    suppressKey(plateCanonical, signature),
    confirmedAtMs + T_COOLDOWN_MS,
  );
}

/** Test helper. */
export function __resetDedupStateForTests(): void {
  mergeBySessionSignature.clear();
  suppressUntilByPlateSignature.clear();
}
