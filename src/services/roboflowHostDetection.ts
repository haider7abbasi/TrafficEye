/**
 * Hosted inference against Roboflow's detect API.
 * @see https://detect.roboflow.com/{project_id}/{version}?api_key=...
 *
 * Requires `axios` and `@env` values from `.env` (see `.env.example`).
 */
import axios from 'axios';
import {
  ROBOFLOW_API_KEY,
  ROBOFLOW_PROJECT_BIKE_HELMET,
  ROBOFLOW_PROJECT_MOBILE_PHONE,
  ROBOFLOW_PROJECT_NUMBER_PLATE,
  ROBOFLOW_PROJECT_SEATBELT,
  ROBOFLOW_VERSION_BIKE_HELMET,
  ROBOFLOW_VERSION_MOBILE_PHONE,
  ROBOFLOW_VERSION_NUMBER_PLATE,
  ROBOFLOW_VERSION_SEATBELT,
} from '@env';

export type RoboflowTrafficProject =
  | 'seatbelt'
  | 'number_plate'
  | 'mobile_phone'
  | 'bike_helmet';

function projectIdFor(key: RoboflowTrafficProject): string {
  switch (key) {
    case 'seatbelt':
      return ROBOFLOW_PROJECT_SEATBELT;
    case 'number_plate':
      return ROBOFLOW_PROJECT_NUMBER_PLATE;
    case 'mobile_phone':
      return ROBOFLOW_PROJECT_MOBILE_PHONE;
    case 'bike_helmet':
      return ROBOFLOW_PROJECT_BIKE_HELMET;
  }
}

/** Strip optional leading "v"; default "1" if unset or empty. */
function normalizeModelVersion(raw: string | undefined): string {
  const t = raw?.trim().replace(/^v/i, '') ?? '';
  return t.length > 0 ? t : '1';
}

function modelVersionFor(project: RoboflowTrafficProject): string {
  switch (project) {
    case 'seatbelt':
      return normalizeModelVersion(ROBOFLOW_VERSION_SEATBELT);
    case 'number_plate':
      return normalizeModelVersion(ROBOFLOW_VERSION_NUMBER_PLATE);
    case 'mobile_phone':
      return normalizeModelVersion(ROBOFLOW_VERSION_MOBILE_PHONE);
    case 'bike_helmet':
      return normalizeModelVersion(ROBOFLOW_VERSION_BIKE_HELMET);
  }
}

export type RoboflowDetectParams = {
  project: RoboflowTrafficProject;
  /** Local `file://` or content URI from camera / image picker */
  imageUri: string;
  mimeType?: string;
  fileName?: string;
  timeoutMs?: number;
  maxRetries?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function shouldRetryAxiosError(e: unknown): boolean {
  if (!axios.isAxiosError(e)) {
    return false;
  }
  const status = e.response?.status;
  if (status === 429) {
    return true;
  }
  if (typeof status === 'number' && status >= 500) {
    return true;
  }
  // Network / timeout / no-status failures.
  return status == null;
}

/**
 * POST multipart image to Roboflow hosted object-detection endpoint.
 * Response shape depends on your model; cast or validate at the call site.
 */
export async function runRoboflowHostDetection(
  params: RoboflowDetectParams,
): Promise<unknown> {
  const apiKey = ROBOFLOW_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('ROBOFLOW_API_KEY is missing. Set it in local .env (never commit).');
  }

  const projectId = projectIdFor(params.project).trim();
  if (!projectId) {
    throw new Error(`Roboflow project id missing for "${params.project}" in @env.`);
  }

  const version = modelVersionFor(params.project);
  const url = `https://detect.roboflow.com/${encodeURIComponent(projectId)}/${encodeURIComponent(version)}`;

  const form = new FormData();
  form.append('file', {
    uri: params.imageUri,
    type: params.mimeType ?? 'image/jpeg',
    name: params.fileName ?? 'frame.jpg',
  } as unknown as Blob);

  const maxRetries = Math.max(0, params.maxRetries ?? 2);
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const { data } = await axios.post<unknown>(url, form, {
        params: { api_key: apiKey },
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: params.timeoutMs ?? 60_000,
      });
      return data;
    } catch (e) {
      const canRetry = attempt < maxRetries && shouldRetryAxiosError(e);
      if (canRetry) {
        // Exponential backoff + small jitter to reduce burst pressure.
        const base = 600 * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 200);
        await sleep(base + jitter);
        continue;
      }
      if (axios.isAxiosError(e)) {
        const ax = e;
        const detail = typeof ax.response?.data === 'string' ? ax.response.data : JSON.stringify(ax.response?.data);
        throw new Error(
          `Roboflow request failed (${ax.response?.status ?? 'no-status'}): ${detail || ax.message}`,
        );
      }
      throw e;
    }
  }
  throw new Error('Roboflow request unexpectedly exhausted retries.');
}
