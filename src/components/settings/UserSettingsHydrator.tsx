import { useEffect, useRef } from 'react';
import { getFirebaseAuth } from '../../config/firebase';
import { useApp } from '../../context/AppContext';
import { loadUserSettingsFromFirestore } from '../../services/userSettingsFirestore';
import { useReduxDispatch } from '../../store';
import { hydrateSettings } from '../../store/slices/settingsSlice';

/** Loads `users/{uid}.appSettings` into Redux when the officer session becomes available. */
export function UserSettingsHydrator() {
  const { hasAccess } = useApp();
  const dispatch = useReduxDispatch();
  const lastUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasAccess) {
      lastUidRef.current = null;
      return;
    }
    const uid = getFirebaseAuth().currentUser?.uid;
    if (!uid || uid === lastUidRef.current) {
      return;
    }
    lastUidRef.current = uid;

    let cancelled = false;
    (async () => {
      try {
        const patch = await loadUserSettingsFromFirestore(uid);
        if (!cancelled && patch) {
          dispatch(hydrateSettings(patch));
        }
      } catch (e) {
        console.warn('[UserSettingsHydrator]', (e as { message?: string })?.message ?? e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasAccess, dispatch]);

  return null;
}
