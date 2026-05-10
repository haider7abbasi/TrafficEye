import { createThumbnail } from 'react-native-create-thumbnail';
import { getRealPath, getVideoMetaData } from 'react-native-compressor';

const INTERVAL_MS = 1000;
/** Cap how much of a long clip we sample (memory + UX). */
const CAP_DURATION_MS = 120_000;
const MAX_FRAMES = 120;

function toThumbnailVideoUrl(pathOrUri: string): string {
  const t = pathOrUri.trim();
  if (t.startsWith('file://') || t.startsWith('content://') || t.startsWith('http')) {
    return t;
  }
  return `file://${t}`;
}

/**
 * Resolves a gallery `content://` (or `file://`) URI to a path the native stack accepts,
 * then builds ~1 FPS JPEG frame URIs using `react-native-create-thumbnail`.
 */
export async function extractApprox1FpsJpegUrisFromVideo(
  pickedUri: string,
): Promise<{ frameUris: string[]; durationMs: number }> {
  const realPath = await getRealPath(pickedUri, 'video');
  const metaPath = realPath.startsWith('file://') ? realPath.replace(/^file:\/\//, '') : realPath;

  let durationSec = 0;
  try {
    const meta = await getVideoMetaData(metaPath);
    durationSec = Number(meta.duration);
    if (!Number.isFinite(durationSec) || durationSec < 0) {
      durationSec = 0;
    }
  } catch {
    durationSec = 0;
  }

  const knownDuration = durationSec > 0;
  const rawDurationMs = knownDuration ? Math.round(durationSec * 1000) : 0;
  const cappedDurationMs = knownDuration ? Math.min(rawDurationMs, CAP_DURATION_MS) : 0;

  const videoUrl = toThumbnailVideoUrl(realPath);

  const timestamps: number[] = [];
  if (!knownDuration || cappedDurationMs <= 0) {
    timestamps.push(0);
  } else {
    for (let t = 0; t <= cappedDurationMs && timestamps.length < MAX_FRAMES; t += INTERVAL_MS) {
      timestamps.push(t);
    }
  }

  const frameUris: string[] = [];
  for (const timeStamp of timestamps) {
    const res = await createThumbnail({
      url: videoUrl,
      timeStamp,
      format: 'jpeg',
      maxHeight: 720,
      maxWidth: 1280,
    });
    const uri = res.path.startsWith('file://') ? res.path : `file://${res.path}`;
    frameUris.push(uri);
  }

  return { frameUris, durationMs: knownDuration ? rawDurationMs : 0 };
}
