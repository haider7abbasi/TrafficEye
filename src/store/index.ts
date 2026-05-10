export { store, persistor, type RootState, type AppDispatch } from './configureStore';
export {
  useReduxDispatch,
  useReduxSelector,
} from './hooks';
export {
  setNotificationsEnabled,
  setSoundEnabled,
  setVibrationEnabled,
  setDarkMode,
  setAutoSavePhotos,
  setDetectionConfidence,
  setCameraQuality,
  setLanguage,
  resetSettings,
  type SettingsState,
  type CameraQualityOption,
  type LanguageOption,
} from './slices/settingsSlice';
