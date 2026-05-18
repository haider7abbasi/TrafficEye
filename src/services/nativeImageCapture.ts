import {
  launchCamera,
  launchImageLibrary,
  type ImagePickerResponse,
  type PhotoQuality,
} from 'react-native-image-picker';
import { getCapturePhotoQuality } from '../store/cameraQuality';
import {
  ensureAndroidCameraPermission,
  ensureAndroidGalleryReadPermission,
  ensureAndroidVideoReadPermission,
} from './androidCapturePermissions';

export type PickedImage = {
  uri: string;
  mimeType?: string;
  fileName?: string;
};

export type PickedVideo = PickedImage;

function pickerPhotoQuality(): PhotoQuality {
  return getCapturePhotoQuality() as PhotoQuality;
}

function stillPhotoOptions() {
  return {
    mediaType: 'photo' as const,
    quality: pickerPhotoQuality(),
    includeBase64: false,
  };
}

function mapResponse(response: ImagePickerResponse): PickedImage | null {
  if (response.didCancel) {
    return null;
  }
  if (response.errorCode) {
    const detail = response.errorMessage ?? response.errorCode;
    throw new Error(detail);
  }
  const asset = response.assets?.[0];
  if (!asset?.uri) {
    return null;
  }
  return {
    uri: asset.uri,
    mimeType: asset.type ?? undefined,
    fileName: asset.fileName ?? undefined,
  };
}

const videoCamera = {
  mediaType: 'video' as const,
  videoQuality: 'high' as const,
  durationLimit: 300,
  includeBase64: false,
};

/** Opens the device camera for a still photo; returns `null` if the user cancels. */
export async function capturePhotoWithDeviceCamera(): Promise<PickedImage | null> {
  const allowed = await ensureAndroidCameraPermission();
  if (!allowed) {
    throw new Error('Camera permission was denied.');
  }
  const response = await launchCamera({
    ...stillPhotoOptions(),
    saveToPhotos: false,
    cameraType: 'back',
  });
  return mapResponse(response);
}

/** Opens the device camera to record a video; returns `null` if the user cancels. */
export async function captureVideoWithDeviceCamera(): Promise<PickedVideo | null> {
  const allowed = await ensureAndroidCameraPermission();
  if (!allowed) {
    throw new Error('Camera permission was denied.');
  }
  const response = await launchCamera({
    ...videoCamera,
    saveToPhotos: false,
    cameraType: 'back',
  });
  return mapResponse(response);
}

/** Opens the system photo picker; returns `null` if the user cancels. */
export async function pickPhotoFromDeviceLibrary(): Promise<PickedImage | null> {
  const allowed = await ensureAndroidGalleryReadPermission();
  if (!allowed) {
    throw new Error('Photo library permission was denied.');
  }
  const response = await launchImageLibrary({
    ...stillPhotoOptions(),
    selectionLimit: 1,
  });
  return mapResponse(response);
}

function videoPickOptions() {
  return {
    mediaType: 'video' as const,
    quality: pickerPhotoQuality(),
    includeBase64: false,
  };
}

/** Opens the system video picker (e.g. MP4); returns `null` if the user cancels. */
export async function pickVideoFromDeviceLibrary(): Promise<PickedVideo | null> {
  const allowed = await ensureAndroidVideoReadPermission();
  if (!allowed) {
    throw new Error('Video library permission was denied.');
  }
  const response = await launchImageLibrary({
    ...videoPickOptions(),
    selectionLimit: 1,
  });
  return mapResponse(response);
}
