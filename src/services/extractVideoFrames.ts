import { createThumbnail } from 'react-native-create-thumbnail';
import { getRealPath, getVideoMetaData } from 'react-native-compressor';

const INTERVAL_MS = 1000;
/** Cap how much of a long clip we sample (memory + UX). */
const CAP_DURATION_MS = 120_000;
const MAX_FRAMES = 120;
/** When duration metadata is missing, stop probing after this many failed thumbnails in a row. */
const PROBE_MAX_CONSECUTIVE_FAILS = 3;
/** Small pause between native thumbnail calls (reduces pressure on some Android devices). */
const THUMB_GAP_MS = 32;

function toThumbnailVideoUrl(pathOrUri: string): string {
  const t = pathOrUri.trim();
  if (t.startsWith('file://') || t.startsWith('content://') || t.startsWith('http')) {
    return t;
  }
  return `file://${t}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Normalize `getVideoMetaData().duration` to milliseconds.
 * Some devices return **seconds** (float); others occasionally expose **milliseconds** as a large int.
 */
function durationToMilliseconds(raw: unknown): number {
  const d = Number(raw);
  if (!Number.isFinite(d) || d <= 0) {
    return 0;
  }
  // Values larger than 24h expressed as *seconds* are implausible → treat as ms.
  if (d > 24 * 60 * 60) {
    return Math.round(d);
  }
  return Math.round(d * 1000);
}

async function extractOneJpegFrame(
  videoUrl: string,
  timeStampMs: number,
): Promise<string | null> {
  try {
    const res = await createThumbnail({
      url: videoUrl,
      timeStamp: timeStampMs,
      format: 'jpeg',
      maxHeight: 720,
      maxWidth: 1280,
    });
    const uri = res.path.startsWith('file://') ? res.path : `file://${res.path}`;
    return uri;
  } catch (e) {
    console.warn('[extractVideoFrames] thumbnail failed', { timeStampMs, e });
    return null;
  }
}

/**
 * When duration is unknown, sample at 1s steps until consecutive failures or max frames.
 */
async function probeFramesWithoutDuration(videoUrl: string): Promise<string[]> {
  const frameUris: string[] = [];
  let consecutiveFails = 0;
  for (let i = 0; i < MAX_FRAMES && consecutiveFails < PROBE_MAX_CONSECUTIVE_FAILS; i++) {
    const timeStampMs = i * INTERVAL_MS;
    const uri = await extractOneJpegFrame(videoUrl, timeStampMs);
    if (uri) {
      frameUris.push(uri);
      consecutiveFails = 0;
    } else {
      consecutiveFails += 1;
    }
    await sleep(THUMB_GAP_MS);
  }
  return frameUris;
}

/**
 * Resolves a gallery `content://` (or `file://`) URI to a path the native stack accepts,
 * then builds ~1 FPS JPEG frame URIs using `react-native-create-thumbnail`.
 *
 * @param pickedUri - Video URI from picker
 * @param _mimeType - Reserved for future `getRealPath` hints (optional)
 */
export async function extractApprox1FpsJpegUrisFromVideo(
  pickedUri: string,
  _mimeType?: string,
): Promise<{ frameUris: string[]; durationMs: number }> {
  const realPath = await getRealPath(pickedUri, 'video');
  const metaPath = realPath.startsWith('file://') ? realPath.replace(/^file:\/\//, '') : realPath;

  let durationMs = 0;
  try {
    const meta = await getVideoMetaData(metaPath);
    durationMs = durationToMilliseconds(meta.duration);
  } catch {
    durationMs = 0;
  }

  const knownDuration = durationMs > 0;
  const cappedDurationMs = knownDuration ? Math.min(durationMs, CAP_DURATION_MS) : 0;

  const videoUrl = toThumbnailVideoUrl(realPath);

  const timestamps: number[] = [];
  if (!knownDuration || cappedDurationMs <= 0) {
    const probed = await probeFramesWithoutDuration(videoUrl);
    return { frameUris: probed, durationMs: knownDuration ? durationMs : 0 };
  }

  for (let t = 0; t <= cappedDurationMs && timestamps.length < MAX_FRAMES; t += INTERVAL_MS) {
    timestamps.push(t);
  }

  const frameUris: string[] = [];
  for (const timeStamp of timestamps) {
    const uri = await extractOneJpegFrame(videoUrl, timeStamp);
    if (uri) {
      frameUris.push(uri);
    }
    await sleep(THUMB_GAP_MS);
  }

  return { frameUris, durationMs };
}
