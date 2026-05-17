/**
 * Hosted inference against Roboflow's detect API.
 * @see https://detect.roboflow.com/{project_id}/{version}?api_key=...
 *
 * Requires `axios` and `@env` values from `.env` (see `.env.example`).
 */
import axios from 'axios';
import { ROBOFLOW_API_KEY } from '@env';
import {
  buildRoboflowDetectUrl,
  getRoboflowDeployConfig,
  type RoboflowTrafficProject,
} from '../config/roboflowModels';

export type { RoboflowTrafficProject } from '../config/roboflowModels';

const LOG_PREFIX = '[Roboflow]';

function rfDebug(...args: unknown[]) {
  if (__DEV__) {
    console.log(LOG_PREFIX, ...args);
  }
}

function rfWarn(...args: unknown[]) {
  console.warn(LOG_PREFIX, ...args);
}

/** Safe URI hint for logs (no long paths). */
function uriKind(uri: string): string {
  const u = uri.slice(0, 32);
  if (uri.startsWith('content://')) {
    return 'content://…';
  }
  if (uri.startsWith('file://')) {
    return 'file://…';
  }
  if (/^https?:\/\//i.test(uri)) {
    return 'remote-url';
  }
  return u.length < uri.length ? `${u}…` : u;
}

export type RoboflowDetectParams = {
  project: RoboflowTrafficProject;
  /** Local `file://` or content URI from camera / image picker */
  imageUri: string;
  mimeType?: string;
  fileName?: string;
  /** App threshold 0–1; sent to Roboflow as `confidence` query param (0–100). */
  confidenceThreshold?: number;
  timeoutMs?: number;
  maxRetries?: number;
};

/** Roboflow `confidence` query param expects 0–100. */
function toRoboflowApiConfidence(threshold01: number): number {
  return Math.round(Math.max(0, Math.min(1, threshold01)) * 100);
}

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
    rfWarn('inference aborted: ROBOFLOW_API_KEY is empty (check .env and Metro --reset-cache)');
    throw new Error('ROBOFLOW_API_KEY is missing. Set it in local .env (never commit).');
  }

  const { projectId, version } = getRoboflowDeployConfig(params.project);
  if (!projectId) {
    rfWarn(`inference aborted: missing project id in @env for "${params.project}"`);
    throw new Error(`Roboflow project id missing for "${params.project}" in @env.`);
  }

  const url = buildRoboflowDetectUrl(projectId, version);

  const mimeType = params.mimeType ?? 'image/jpeg';
  const fileName = params.fileName ?? 'frame.jpg';
  const timeoutMs = params.timeoutMs ?? 60_000;
  const queryParams: Record<string, string> = { api_key: apiKey };
  if (typeof params.confidenceThreshold === 'number') {
    queryParams.confidence = String(toRoboflowApiConfidence(params.confidenceThreshold));
  }

  rfDebug('request', {
    project: params.project,
    projectId,
    version,
    endpoint: url,
    confidenceQuery: queryParams.confidence ?? '(default)',
    uriKind: uriKind(params.imageUri),
    mimeType,
    fileName,
    timeoutMs,
    apiKeyPresent: true,
  });

  const form = new FormData();
  form.append('file', {
    uri: params.imageUri,
    type: mimeType,
    name: fileName,
  } as unknown as Blob);

  const maxRetries = Math.max(0, params.maxRetries ?? 2);
  const started = Date.now();
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const { data } = await axios.post<unknown>(url, form, {
        params: queryParams,
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: timeoutMs,
      });
      rfDebug('response ok', {
        project: params.project,
        version,
        attempt: attempt + 1,
        ms: Date.now() - started,
      });
      return data;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const ax = e;
        const status = ax.response?.status;
        const detail =
          typeof ax.response?.data === 'string' ? ax.response.data : JSON.stringify(ax.response?.data);
        rfWarn('request error', {
          project: params.project,
          projectId,
          version,
          attempt: attempt + 1,
          maxAttempts: maxRetries + 1,
          status: status ?? 'no-status',
          code: ax.code,
          message: ax.message,
          detail: detail?.slice?.(0, 500) ?? detail,
        });
      } else {
        rfWarn('request threw (non-axios)', { project: params.project, error: String(e) });
      }

      const canRetry = attempt < maxRetries && shouldRetryAxiosError(e);
      if (canRetry) {
        // Exponential backoff + small jitter to reduce burst pressure.
        const base = 600 * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 200);
        const waitMs = base + jitter;
        rfWarn('retrying after backoff', { waitMs, nextAttempt: attempt + 2 });
        await sleep(waitMs);
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
  rfWarn('exhausted retries', { project: params.project, projectId, version });
  throw new Error('Roboflow request unexpectedly exhausted retries.');
}
