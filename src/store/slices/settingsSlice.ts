import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type CameraQualityOption =
  | 'Low (Faster)'
  | 'Medium'
  | 'High (Recommended)'
  | 'Ultra (Slower)';

export type LanguageOption = 'English' | 'Español' | 'Français' | 'Deutsch' | '中文';

export type SettingsState = {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  darkMode: boolean;
  autoSavePhotos: boolean;
  detectionConfidence: number;
  cameraQuality: CameraQualityOption;
  language: LanguageOption;
};

const initialState: SettingsState = {
  notificationsEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  darkMode: false,
  autoSavePhotos: true,
  detectionConfidence: 75,
  cameraQuality: 'High (Recommended)',
  language: 'English',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setNotificationsEnabled(state, action: PayloadAction<boolean>) {
      state.notificationsEnabled = action.payload;
    },
    setSoundEnabled(state, action: PayloadAction<boolean>) {
      state.soundEnabled = action.payload;
    },
    setVibrationEnabled(state, action: PayloadAction<boolean>) {
      state.vibrationEnabled = action.payload;
    },
    setDarkMode(state, action: PayloadAction<boolean>) {
      state.darkMode = action.payload;
    },
    setAutoSavePhotos(state, action: PayloadAction<boolean>) {
      state.autoSavePhotos = action.payload;
    },
    setDetectionConfidence(state, action: PayloadAction<number>) {
      state.detectionConfidence = Math.min(100, Math.max(50, Math.round(action.payload)));
    },
    setCameraQuality(state, action: PayloadAction<CameraQualityOption>) {
      state.cameraQuality = action.payload;
    },
    setLanguage(state, action: PayloadAction<LanguageOption>) {
      state.language = action.payload;
    },
    resetSettings: () => initialState,
  },
});

export const {
  setNotificationsEnabled,
  setSoundEnabled,
  setVibrationEnabled,
  setDarkMode,
  setAutoSavePhotos,
  setDetectionConfidence,
  setCameraQuality,
  setLanguage,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
