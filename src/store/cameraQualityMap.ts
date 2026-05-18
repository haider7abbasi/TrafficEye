import type { CameraQualityOption } from './slices/settingsSlice';

/** JPEG compression for `react-native-image-picker` (0–1). */
export const CAMERA_QUALITY_JPEG: Record<CameraQualityOption, number> = {
  'Low (Faster)': 0.7,
  Medium: 0.8,
  'High (Recommended)': 0.9,
  'Ultra (Slower)': 1,
};

export const DEFAULT_CAMERA_QUALITY: CameraQualityOption = 'High (Recommended)';

export function photoQualityForPreset(option: CameraQualityOption): number {
  return CAMERA_QUALITY_JPEG[option] ?? CAMERA_QUALITY_JPEG[DEFAULT_CAMERA_QUALITY];
}

export function qualityPercentLabel(option: CameraQualityOption): string {
  const pct = Math.round(photoQualityForPreset(option) * 100);
  return `${pct}% JPEG`;
}

export function photoQualityForPresetOrUnknown(option: string | undefined): number {
  if (option && option in CAMERA_QUALITY_JPEG) {
    return CAMERA_QUALITY_JPEG[option as CameraQualityOption];
  }
  return CAMERA_QUALITY_JPEG[DEFAULT_CAMERA_QUALITY];
}
