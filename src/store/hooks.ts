import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { AppDispatch, RootState } from './configureStore';

/** Typed Redux dispatch (distinct from `useApp` from `AppContext`). */
export const useReduxDispatch = () => useDispatch<AppDispatch>();

/** Typed Redux selector hook. */
export const useReduxSelector: TypedUseSelectorHook<RootState> = useSelector;
