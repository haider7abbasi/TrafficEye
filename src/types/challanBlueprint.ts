import type { SpecViolationId } from '../rules/specViolationMapping';

/** Pre-confirmation queue item (implementation plan §4 `candidates`). */
export type CandidateStatus = 'pending_review' | 'discarded' | 'confirmed';
export type CandidateDedupDecision = 'create' | 'merge' | 'suppress';

export interface CandidateRecord {
  officerId: string;
  sessionId?: string;
  rulesFreezeVersion: number;
  dedupDecision?: CandidateDedupDecision;
  dedupSignature?: string;
  createdAt: string;
  violationTypes: SpecViolationId[];
  evidenceImageRef?: string;
  plateCropRef?: string;
  plateBox?: { x: number; y: number; width: number; height: number; confidence: number };
  vehiclePlateDisplay?: string;
  vehiclePlateCanonical?: string;
  locationText?: string;
  status: CandidateStatus;
}

/** Post-confirmation persisted challan (implementation plan §4 `challans`). */
export interface ChallanRecord {
  challanId: string;
  officerId: string;
  rulesFreezeVersion: number;
  confirmedAt: string;
  expiresAt: string;
  violationTypes: SpecViolationId[];
  vehiclePlateDisplay: string;
  vehiclePlateCanonical: string;
  evidenceImageRef: string;
  plateCropRef?: string;
  locationText?: string;
}
