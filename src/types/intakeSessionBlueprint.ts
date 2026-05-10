/** `intake_sessions/{sessionId}` — metadata for capture / upload / live (§4). */
export interface IntakeSessionRecord {
  officerId: string;
  startedAt: string;
  mode?: 'still' | 'video' | 'upload' | 'live';
}
