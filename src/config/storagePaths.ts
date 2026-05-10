/**
 * Canonical Storage object layouts (must stay aligned with `storage.rules`).
 *
 * - candidates/{officerId}/{candidateId}/… — evidence + plate crop before confirm
 * - challans/{officerId}/{challanId}/… — bundle incl. PDF after confirm
 * - sessions/{officerId}/{sessionId}/frames/… — transient live / video frames
 */

export function candidateEvidenceObjectPath(
  officerId: string,
  candidateId: string,
  fileName: string,
): string {
  return `candidates/${officerId}/${candidateId}/${fileName}`;
}

export function candidatePlateCropObjectPath(
  officerId: string,
  candidateId: string,
  fileName = 'plate.jpg',
): string {
  return `candidates/${officerId}/${candidateId}/${fileName}`;
}

export function challanBundleObjectPath(
  officerId: string,
  challanId: string,
  fileName: string,
): string {
  return `challans/${officerId}/${challanId}/${fileName}`;
}

export function sessionFrameObjectPath(
  officerId: string,
  sessionId: string,
  frameId: string,
): string {
  return `sessions/${officerId}/${sessionId}/frames/${frameId}`;
}
