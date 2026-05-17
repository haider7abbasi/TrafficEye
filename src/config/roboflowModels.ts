/**
 * Roboflow hosted inference — project slug + deploy version per model.
 * All values come from `@env` (`.env`); change numbers there and restart Metro with `--reset-cache`.
 *
 * Current dashboard deploys (keep .env in sync when you retrain / bump versions):
 * - seatbelt-detection-lb1ec-jborv → v2
 * - np-recognization → v1
 * - mobile_phone_detection-hhrf7 → v2
 * - bike-helmet-sbg4b-kwudk → v2
 * - vehicles-k83q3-iighp → v1 (scene / vehicle-type context)
 */
import {
  ROBOFLOW_PROJECT_BIKE_HELMET,
  ROBOFLOW_PROJECT_MOBILE_PHONE,
  ROBOFLOW_PROJECT_NUMBER_PLATE,
  ROBOFLOW_PROJECT_SEATBELT,
  ROBOFLOW_PROJECT_VEHICLE,
  ROBOFLOW_VERSION_BIKE_HELMET,
  ROBOFLOW_VERSION_MOBILE_PHONE,
  ROBOFLOW_VERSION_NUMBER_PLATE,
  ROBOFLOW_VERSION_SEATBELT,
  ROBOFLOW_VERSION_VEHICLE,
} from '@env';

export type RoboflowTrafficProject =
  | 'seatbelt'
  | 'number_plate'
  | 'mobile_phone'
  | 'bike_helmet'
  | 'vehicle';

/** Strip optional leading "v"; must be digits for hosted REST path segment. */
export function normalizeRoboflowModelVersion(raw: string | undefined, envKey: string): string {
  const t = raw?.trim().replace(/^v/i, '') ?? '';
  if (/^\d+$/.test(t)) {
    return t;
  }
  if (t.length > 0) {
    console.warn(
      `[Roboflow] ${envKey}="${raw}" is not a plain integer deploy id; using first digit sequence or fallback.`,
    );
    const digits = t.match(/^\d+/)?.[0];
    if (digits) {
      return digits;
    }
  }
  console.warn(
    `[Roboflow] ${envKey} is missing or invalid; defaulting to "1". Set ROBOFLOW_VERSION_* in .env to your Roboflow model version.`,
  );
  return '1';
}

export type RoboflowDeployConfig = {
  project: RoboflowTrafficProject;
  projectId: string;
  version: string;
};

/** Hosted detect URL (no API key) — must match Roboflow Deploy → Inference. */
export function buildRoboflowDetectUrl(projectId: string, version: string): string {
  return `https://detect.roboflow.com/${encodeURIComponent(projectId)}/${encodeURIComponent(version)}`;
}

/** Resolved `{project_id}/{version}` inputs for `detect.roboflow.com` — always from env. */
export function getRoboflowDeployConfig(project: RoboflowTrafficProject): RoboflowDeployConfig {
  switch (project) {
    case 'seatbelt':
      return {
        project,
        projectId: (ROBOFLOW_PROJECT_SEATBELT ?? '').trim(),
        version: normalizeRoboflowModelVersion(ROBOFLOW_VERSION_SEATBELT, 'ROBOFLOW_VERSION_SEATBELT'),
      };
    case 'number_plate':
      return {
        project,
        projectId: (ROBOFLOW_PROJECT_NUMBER_PLATE ?? '').trim(),
        version: normalizeRoboflowModelVersion(ROBOFLOW_VERSION_NUMBER_PLATE, 'ROBOFLOW_VERSION_NUMBER_PLATE'),
      };
    case 'mobile_phone':
      return {
        project,
        projectId: (ROBOFLOW_PROJECT_MOBILE_PHONE ?? '').trim(),
        version: normalizeRoboflowModelVersion(ROBOFLOW_VERSION_MOBILE_PHONE, 'ROBOFLOW_VERSION_MOBILE_PHONE'),
      };
    case 'bike_helmet':
      return {
        project,
        projectId: (ROBOFLOW_PROJECT_BIKE_HELMET ?? '').trim(),
        version: normalizeRoboflowModelVersion(ROBOFLOW_VERSION_BIKE_HELMET, 'ROBOFLOW_VERSION_BIKE_HELMET'),
      };
    case 'vehicle': {
      const vehicleId = (ROBOFLOW_PROJECT_VEHICLE ?? '').trim();
      return {
        project,
        /** Default matches bundled TrafficEye vehicle deploy when env not set. */
        projectId: vehicleId || 'vehicles-k83q3-iighp',
        version: normalizeRoboflowModelVersion(
          ROBOFLOW_VERSION_VEHICLE ?? '1',
          'ROBOFLOW_VERSION_VEHICLE',
        ),
      };
    }
  }
}

const ALL_PROJECTS: RoboflowTrafficProject[] = [
  'seatbelt',
  'number_plate',
  'mobile_phone',
  'bike_helmet',
  'vehicle',
];

/** Snapshot for settings / debug UI (no API keys). */
export function getRoboflowDeployRegistry(): Record<RoboflowTrafficProject, { projectId: string; version: string }> {
  const out = {} as Record<RoboflowTrafficProject, { projectId: string; version: string }>;
  for (const p of ALL_PROJECTS) {
    const c = getRoboflowDeployConfig(p);
    out[p] = { projectId: c.projectId, version: c.version };
  }
  return out;
}

export function listRoboflowTrafficProjects(): readonly RoboflowTrafficProject[] {
  return ALL_PROJECTS;
}
