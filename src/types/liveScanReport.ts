export type LiveScanMode = 'live' | 'video';

export type LiveScanOutcome = 'violation' | 'clear' | 'suppressed' | 'error';

export type LiveScanFrameEntry = {
  frameId: string;
  outcome: LiveScanOutcome;
  summary: string;
  violations: string[];
  timestamp: string;
};

export type LiveScanReport = {
  sessionId: string;
  mode: LiveScanMode;
  startedAt: string;
  endedAt: string;
  totalFrames: number;
  violationsSaved: number;
  clearFrames: number;
  suppressedFrames: number;
  errorFrames: number;
  entries: LiveScanFrameEntry[];
};

export function buildLiveScanReport(
  accum: {
    sessionId: string;
    mode: LiveScanMode;
    startedAt: string;
    entries: LiveScanFrameEntry[];
  },
  endedAt: string = new Date().toISOString(),
): LiveScanReport {
  const violationsSaved = accum.entries.filter(e => e.outcome === 'violation').length;
  const clearFrames = accum.entries.filter(e => e.outcome === 'clear').length;
  const suppressedFrames = accum.entries.filter(e => e.outcome === 'suppressed').length;
  const errorFrames = accum.entries.filter(e => e.outcome === 'error').length;
  return {
    sessionId: accum.sessionId,
    mode: accum.mode,
    startedAt: accum.startedAt,
    endedAt,
    totalFrames: accum.entries.length,
    violationsSaved,
    clearFrames,
    suppressedFrames,
    errorFrames,
    entries: [...accum.entries].reverse(),
  };
}
