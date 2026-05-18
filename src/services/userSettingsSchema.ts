import type { CameraQualityOption, SettingsState } from '../store/slices/settingsSlice';
import { CAMERA_QUALITY_JPEG } from '../store/cameraQualityMap';

export type UserAppSettingsFirestore = {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  detectionConfidence: number;
  cameraQuality: CameraQualityOption;
};

const QUALITY_OPTIONS = new Set<string>(Object.keys(CAMERA_QUALITY_JPEG));

function isCameraQuality(value: unknown): value is CameraQualityOption {
  return typeof value === 'string' && QUALITY_OPTIONS.has(value);
}

export function settingsStateToFirestore(settings: SettingsState): UserAppSettingsFirestore {
  return {
    notificationsEnabled: settings.notificationsEnabled,
    soundEnabled: settings.soundEnabled,
    vibrationEnabled: settings.vibrationEnabled,
    detectionConfidence: settings.detectionConfidence,
    cameraQuality: settings.cameraQuality,
  };
}

export function parseUserAppSettings(raw: unknown): Partial<SettingsState> | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const data = raw as Record<string, unknown>;
  const patch: Partial<SettingsState> = {};

  if (typeof data.notificationsEnabled === 'boolean') {
    patch.notificationsEnabled = data.notificationsEnabled;
  }
  if (typeof data.soundEnabled === 'boolean') {
    patch.soundEnabled = data.soundEnabled;
  }
  if (typeof data.vibrationEnabled === 'boolean') {
    patch.vibrationEnabled = data.vibrationEnabled;
  }
  if (typeof data.detectionConfidence === 'number' && Number.isFinite(data.detectionConfidence)) {
    patch.detectionConfidence = Math.min(100, Math.max(50, Math.round(data.detectionConfidence)));
  }
  if (isCameraQuality(data.cameraQuality)) {
    patch.cameraQuality = data.cameraQuality;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}
