import { Platform, PermissionsAndroid } from 'react-native';

function androidSdkInt(): number {
  if (Platform.OS !== 'android') {
    return 0;
  }
  return typeof Platform.Version === 'number' ? Platform.Version : Number(Platform.Version);
}

async function requestIfNeeded(
  permission: (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS],
  rationale: { title: string; message: string },
): Promise<boolean> {
  const already = await PermissionsAndroid.check(permission);
  if (already) {
    return true;
  }
  const status = await PermissionsAndroid.request(permission, {
    title: rationale.title,
    message: rationale.message,
    buttonPositive: 'Allow',
    buttonNegative: 'Cancel',
  });
  return status === PermissionsAndroid.RESULTS.GRANTED;
}

/** Returns false if the user denied permission (Android only; iOS always true). */
export async function ensureAndroidCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  return requestIfNeeded(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: 'Camera access',
    message: 'TrafficEye needs the camera to capture traffic scenes for analysis.',
  });
}

/**
 * Gallery / photo picker on Android 12 and below may need broad storage read;
 * Android 13+ uses READ_MEDIA_IMAGES. Returns false if denied.
 */
export async function ensureAndroidGalleryReadPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const sdk = androidSdkInt();
  const permission =
    sdk >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  return requestIfNeeded(permission, {
    title: 'Photos access',
    message: 'TrafficEye needs access to your photos to select an image for analysis.',
  });
}

/** Android 13+ video files in the gallery; older API uses broad storage read. */
export async function ensureAndroidVideoReadPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const sdk = androidSdkInt();
  const permission =
    sdk >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  return requestIfNeeded(permission, {
    title: 'Videos access',
    message: 'TrafficEye needs access to your videos to analyze an MP4 clip.',
  });
}
