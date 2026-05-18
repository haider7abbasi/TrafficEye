import type { SpecViolationId } from '../rules/specViolationMapping';
import { renderChallanPdfContent } from './challanPdfLayout';

export type ChallanPdfPayload = {
  challanId: string;
  confirmedAtIso: string;
  expiresAtIso: string;
  officerName: string;
  officerBadge?: string;
  officerDepartment?: string;
  plateDisplay: string;
  plateCanonical: string;
  locationText?: string;
  violationTypes: SpecViolationId[];
  /** e.g. confirmed, issued */
  status?: string;
  /** Firestore candidate id when available */
  candidateId?: string;
  evidenceImageRef?: string;
  plateCropRef?: string;
};

/**
 * Builds a single-page professional challan PDF (base64) without external dependencies.
 */
export function buildChallanPdfBase64(payload: ChallanPdfPayload): string {
  return renderChallanPdfContent(payload).buildBase64();
}
