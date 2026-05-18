import { parseUserAppSettings } from '../src/services/userSettingsSchema';

describe('userSettingsFirestore', () => {
  it('parses appSettings from Firestore user document', () => {
    const patch = parseUserAppSettings({
      notificationsEnabled: false,
      detectionConfidence: 80,
      cameraQuality: 'Medium',
    });
    expect(patch).toEqual({
      notificationsEnabled: false,
      detectionConfidence: 80,
      cameraQuality: 'Medium',
    });
  });

  it('clamps detection confidence', () => {
    const patch = parseUserAppSettings({ detectionConfidence: 120 });
    expect(patch?.detectionConfidence).toBe(100);
  });

  it('ignores invalid camera quality', () => {
    const patch = parseUserAppSettings({ cameraQuality: 'Original (100%)' });
    expect(patch?.cameraQuality).toBeUndefined();
  });
});
