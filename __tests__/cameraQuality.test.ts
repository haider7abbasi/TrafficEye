import {
  CAMERA_QUALITY_JPEG,
  photoQualityForPreset,
  photoQualityForPresetOrUnknown,
} from '../src/store/cameraQualityMap';

describe('cameraQuality', () => {
  it('maps presets to JPEG quality values', () => {
    expect(photoQualityForPreset('Ultra (Slower)')).toBe(1);
    expect(photoQualityForPreset('High (Recommended)')).toBe(0.9);
    expect(photoQualityForPreset('Medium')).toBe(0.8);
    expect(photoQualityForPreset('Low (Faster)')).toBe(0.7);
  });

  it('falls back for unknown persisted values', () => {
    expect(photoQualityForPresetOrUnknown('Original (100%)')).toBe(0.9);
    expect(photoQualityForPresetOrUnknown(undefined)).toBe(0.9);
  });

  it('exports all four presets', () => {
    expect(Object.keys(CAMERA_QUALITY_JPEG)).toHaveLength(4);
  });
});
