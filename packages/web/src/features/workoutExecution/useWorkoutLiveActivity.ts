import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { WorkoutLiveActivity } from 'capacitor-workout-live-activity';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import { buildWorkoutLiveActivityPayload } from './workoutLiveActivityPayload';

const THROTTLE_MS = 2000;

function payloadKey(p: ReturnType<typeof buildWorkoutLiveActivityPayload>): string {
  return JSON.stringify(p);
}

/**
 * iOS: start / update / end Live Activity from canonical session store.
 * Throttles native updates to reduce battery use.
 */
export function useWorkoutLiveActivity(workoutId: string | undefined, startedAt: string | null) {
  const lastSentRef = useRef(0);
  const lastKeyRef = useRef('');

  useEffect(() => {
    const ios = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
    if (!ios || !workoutId || !startedAt) return;

    const flush = (force: boolean) => {
      const state = useWorkoutSessionStore.getState();
      const payload = buildWorkoutLiveActivityPayload(state, workoutId);
      const key = payloadKey(payload);
      const now = Date.now();
      if (
        !force &&
        key === lastKeyRef.current &&
        now - lastSentRef.current < THROTTLE_MS
      ) {
        return;
      }
      lastKeyRef.current = key;
      lastSentRef.current = now;
      void WorkoutLiveActivity.updateWorkoutActivity(payload).catch((e) =>
        console.error('[WorkoutLiveActivity] updateWorkoutActivity failed', e)
      );
    };

    const start = async () => {
      const state = useWorkoutSessionStore.getState();
      const payload = buildWorkoutLiveActivityPayload(state, workoutId);
      lastKeyRef.current = payloadKey(payload);
      lastSentRef.current = Date.now();
      try {
        await WorkoutLiveActivity.startWorkoutActivity(payload);
      } catch (e) {
        console.error('[WorkoutLiveActivity] startWorkoutActivity failed', e);
      }
    };

    let unsub: (() => void) | undefined;
    void (async () => {
      await start();
      unsub = useWorkoutSessionStore.subscribe(() => {
        flush(false);
      });
    })();

    const interval = window.setInterval(() => flush(false), THROTTLE_MS);

    return () => {
      unsub?.();
      window.clearInterval(interval);
      void WorkoutLiveActivity.endWorkoutActivity();
    };
  }, [workoutId, startedAt]);
}
