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
   * When false, a null/empty URI skips that tick but keeps the timer (e.g. live camera `takePhoto` glitch).
   * When true (default), null stops the sampler and runs `onExhausted`.
   */
  exhaustWhenNull?: boolean;
};

/**
 * Generic frame sampler for video/live processing.
 * Prevents overlapping frame handlers (memory-safe sequential processing).
 */
export function startFrameSampler(params: StartFrameSamplerParams): () => void {
  const fps = params.fps ?? 1;
  const intervalMs = Math.max(1000, Math.round(1000 / Math.max(1, fps)));
  const exhaustWhenNull = params.exhaustWhenNull !== false;
  let stopped = false;
  let processing = false;
  let idx = 0;

  let timer: ReturnType<typeof setInterval>;
  const tick = async () => {
    if (stopped || processing) {
      return;
    }
    processing = true;
    try {
      const uri = await params.getNextFrameUri();
      if (uri == null || uri === '') {
        if (exhaustWhenNull) {
          stopped = true;
          clearInterval(timer);
          params.onExhausted?.();
        }
        return;
      }
      const frame: FrameSample = {
        frameId: `f-${Date.now()}-${idx++}`,
        imageUri: uri,
        capturedAt: new Date().toISOString(),
      };
      await params.onFrame(frame);
    } catch (e) {
      params.onError?.(e);
    } finally {
      processing = false;
    }
  };

  timer = setInterval(() => {
    void tick();
  }, intervalMs);

  void tick();

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
