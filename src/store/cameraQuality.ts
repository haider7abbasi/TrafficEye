import { store } from './configureStore';
import { photoQualityForPresetOrUnknown } from './cameraQualityMap';

/** Reads the persisted Settings preset and returns picker JPEG quality. */
export function getCapturePhotoQuality(): number {
  return photoQualityForPresetOrUnknown(store.getState().settings.cameraQuality);
}

export {
  CAMERA_QUALITY_JPEG,
  DEFAULT_CAMERA_QUALITY,
  photoQualityForPreset,
  qualityPercentLabel,
} from './cameraQualityMap';
