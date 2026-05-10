/**
 * Phase-5 scaffolding:
 * converts an ordered list of frame/image URIs into a frame provider consumed by `startFrameSampler`.
 *
 * For MP4 clips, use `createSequentialFrameProvider` with URIs from `extractApprox1FpsJpegUrisFromVideo`.
 */
export function createArrayFrameProvider(frameUris: string[]): () => string | null {
  if (frameUris.length === 0) {
    return () => null;
  }
  let idx = 0;
  return () => {
    const uri = frameUris[idx % frameUris.length];
    idx += 1;
    return uri;
  };
}

/** Yields each URI once (for finite MP4-derived frame lists); then returns `null`. */
export function createSequentialFrameProvider(frameUris: string[]): () => string | null {
  let idx = 0;
  return () => {
    if (idx >= frameUris.length) {
      return null;
    }
    const uri = frameUris[idx];
    idx += 1;
    return uri ?? null;
  };
}
