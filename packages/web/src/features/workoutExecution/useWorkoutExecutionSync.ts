import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';

/** Wall-clock sync when WebView or app resumes (session + timers). */
export function useWorkoutExecutionSync() {
  const syncFromWallClock = useWorkoutSessionStore((s) => s.syncFromWallClock);

  useEffect(() => {
    syncFromWallClock();
  }, [syncFromWallClock]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') syncFromWallClock();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [syncFromWallClock]);

  useEffect(() => {
    let handle: { remove: () => Promise<void> } | undefined;
    void App.addListener('resume', () => syncFromWallClock()).then((h) => {
      handle = h;
    });
    return () => {
      void handle?.remove();
    };
  }, [syncFromWallClock]);
}
