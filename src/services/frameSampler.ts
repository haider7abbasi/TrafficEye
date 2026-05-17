export type FrameSample = {
  frameId: string;
  imageUri: string;
  capturedAt: string;
};

type StartFrameSamplerParams = {
  fps?: number;
  getNextFrameUri: () => Promise<string | null> | string | null;
  onFrame: (frame: FrameSample) => Promise<void> | void;
  onError?: (error: unknown) => void;
  /** Called when `getNextFrameUri` returns `null` (e.g. sequential MP4 frames exhausted). */
  onExhausted?: () => void;
  /**
   * When false, a null/empty URI skips that tick but keeps scheduling (e.g. live camera `takePhoto` glitch).
   * When true (default), null stops the sampler and runs `onExhausted`.
   */
  exhaustWhenNull?: boolean;
};

/**
 * Generic frame sampler for video/live processing.
 * Uses chained timeouts (not `setInterval`) so the next tick starts **after** `onFrame` finishes —
 * avoids overlapping Roboflow work and keeps pacing closer to target FPS when inference is slow.
 */
export function startFrameSampler(params: StartFrameSamplerParams): () => void {
  const fps = params.fps ?? 1;
  const intervalMs = Math.max(33, Math.round(1000 / Math.max(0.1, fps)));
  const exhaustWhenNull = params.exhaustWhenNull !== false;
  let stopped = false;
  let processing = false;
  let idx = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const scheduleNext = () => {
    if (stopped) {
      return;
    }
    clearTimer();
    timer = setTimeout(() => {
      void runTick();
    }, intervalMs);
  };

  const runTick = async () => {
    if (stopped || processing) {
      return;
    }
    processing = true;
    try {
      const uri = await params.getNextFrameUri();
      if (stopped) {
        return;
      }
      if (uri == null || uri === '') {
        if (exhaustWhenNull) {
          stopped = true;
          clearTimer();
          params.onExhausted?.();
          return;
        }
        return;
      }
      const frame: FrameSample = {
        frameId: `f-${Date.now()}-${idx++}`,
        imageUri: uri,
        capturedAt: new Date().toISOString(),
      };
      await params.onFrame(frame);
      if (stopped) {
        return;
      }
    } catch (e) {
      params.onError?.(e);
    } finally {
      processing = false;
      if (!stopped) {
        scheduleNext();
      }
    }
  };

  void runTick();

  return () => {
    stopped = true;
    clearTimer();
  };
}
