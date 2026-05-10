import { launchCamera, launchImageLibrary, type ImagePickerResponse } from 'react-native-image-picker';
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

/** Shared still-image options (quality must stay a `PhotoQuality` literal for typings). */
const stillPhoto = {
  mediaType: 'photo' as const,
  quality: 0.9 as const,
  includeBase64: false,
};

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

/** Opens the device camera; returns `null` if the user cancels. */
export async function capturePhotoWithDeviceCamera(): Promise<PickedImage | null> {
  const allowed = await ensureAndroidCameraPermission();
  if (!allowed) {
    throw new Error('Camera permission was denied.');
  }
  const response = await launchCamera({
    ...stillPhoto,
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
    ...stillPhoto,
    selectionLimit: 1,
  });
  return mapResponse(response);
}

const videoPick = {
  mediaType: 'video' as const,
  quality: 0.9 as const,
  includeBase64: false,
};

/** Opens the system video picker (e.g. MP4); returns `null` if the user cancels. */
export async function pickVideoFromDeviceLibrary(): Promise<PickedVideo | null> {
  const allowed = await ensureAndroidVideoReadPermission();
  if (!allowed) {
    throw new Error('Video library permission was denied.');
  }
  const response = await launchImageLibrary({
    ...videoPick,
    selectionLimit: 1,
  });
  return mapResponse(response);
}
