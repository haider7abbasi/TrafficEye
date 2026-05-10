# TrafficEye — client state (Redux + persistence)

## What runs where

| Layer | Responsibility | Persisted? |
| ----- | ---------------- | ---------- |
| **`AppContext`** (`src/context/AppContext.tsx`) | Firebase Auth session, Firestore-backed user profile, violation records, candidate/challan writes, Storage uploads | **No** — live server state; rehydrate from Firebase on login |
| **Redux store** (`src/store/configureStore.ts`) | Device-only preferences (see `settings` slice) | **Yes** — `redux-persist` + **AsyncStorage** |

Do **not** put secrets, auth tokens, or full Firestore mirrors in Redux Persist. The whitelist is intentionally narrow (`settings` only).

## Libraries

- **`@reduxjs/toolkit`** — store, slice reducers, and typings.
- **`react-redux`** — `Provider`, `useDispatch`, `useSelector`.
- **`redux-persist`** — rehydrate Redux state on cold start.
- **`@react-native-async-storage/async-storage`** — persist engine for `redux-persist` on React Native.

**Media (not Redux):** MP4 intake uses **`react-native-compressor`** (path + duration metadata) and **`react-native-create-thumbnail`** (per-timestamp JPEG). See [`extractVideoFrames.ts`](../src/services/extractVideoFrames.ts). **Live monitoring** uses **`react-native-vision-camera`** (`takePhoto` ~1 Hz) in [`CaptureScreen`](../src/screens/CaptureScreen.tsx).

## File map

| Path | Role |
| ---- | ---- |
| [`src/store/configureStore.ts`](../src/store/configureStore.ts) | `store`, `persistor`, `RootState`, middleware ignores persist actions |
| [`src/store/hooks.ts`](../src/store/hooks.ts) | `useReduxDispatch`, `useReduxSelector` (named to avoid clashing with `useApp`) |
| [`src/store/slices/settingsSlice.ts`](../src/store/slices/settingsSlice.ts) | Persisted UI preferences |
| [`src/App.tsx`](../src/App.tsx) | `Provider` + `PersistGate` wrapping `AppProvider` |
| [`jest.setup.js`](../jest.setup.js) | AsyncStorage Jest mock |

## Adding a new persisted slice

1. Add a reducer under `src/store/slices/`.
2. Register it in `combineReducers` in `configureStore.ts`.
3. Add the slice name to the `whitelist` array in `persistConfig` **only** if it is safe to store on-device indefinitely.

## Tests

Jest uses the official AsyncStorage mock (`jest.setup.js`). Components that only need Redux can be wrapped in `<Provider store={store}>` in tests; for persistence side-effects, prefer mocking the store or testing slices in isolation.
