import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkoutExercise } from '@/types';

/** Elapsed workout seconds from wall clock, excluding completed + in-progress pause intervals. */
export function computeSessionElapsedSeconds(state: {
  startedAt: string | null;
  totalPausedMs: number;
  isPaused: boolean;
  pauseStartedAt: string | null;
}): number {
  if (!state.startedAt) return 0;
  const start = new Date(state.startedAt).getTime();
  const now = Date.now();
  let pausedMs = state.totalPausedMs;
  if (state.isPaused && state.pauseStartedAt) {
    pausedMs += now - new Date(state.pauseStartedAt).getTime();
  }
  return Math.max(0, Math.floor((now - start - pausedMs) / 1000));
}

/** Duration segment elapsed (seconds) from wall clock for the current exercise index. */
export function computeDurationElapsedSeconds(state: {
  currentExerciseIndex: number;
  exercises: WorkoutExercise[];
  durationExerciseIndex: number | null;
  durationRunning: boolean;
  durationStartedAt: string | null;
  durationAccumulatedSeconds: number;
}): number {
  const idx = state.currentExerciseIndex;
  if (state.durationExerciseIndex !== idx) return 0;
  const target = state.exercises[idx]?.durationSeconds ?? 60;
  let elapsed = state.durationAccumulatedSeconds;
  if (state.durationRunning && state.durationStartedAt) {
    elapsed += Math.floor((Date.now() - new Date(state.durationStartedAt).getTime()) / 1000);
  }
  return Math.min(Math.max(0, elapsed), target);
}

export interface WorkoutSessionStore {
  activeWorkoutId: string | null;
  /** Display title for Live Activity / UI (from notes, gym, or start flow). */
  workoutDisplayName: string | null;
  currentExerciseIndex: number;
  exercises: WorkoutExercise[];
  startedAt: string | null;
  elapsedSeconds: number;
  isPaused: boolean;
  totalPausedMs: number;
  pauseStartedAt: string | null;

  durationExerciseIndex: number | null;
  durationRunning: boolean;
  durationStartedAt: string | null;
  durationAccumulatedSeconds: number;

  startSession: (
    workoutId: string,
    exercises: WorkoutExercise[],
    options?: { workoutName?: string }
  ) => void;
  updateExercise: (index: number, updates: Partial<WorkoutExercise>) => void;
  goToExercise: (index: number) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  clearSession: () => void;
  /** Recompute `elapsedSeconds` and derived duration from wall clock (call on resume / visibility). */
  syncFromWallClock: () => void;
  tickElapsed: () => void;
  startDurationSegment: () => void;
  pauseDurationSegment: () => void;
  resetDurationForExerciseChange: () => void;
}

export const useWorkoutSessionStore = create<WorkoutSessionStore>()(
  persist(
    (set, get) => ({
      activeWorkoutId: null,
      workoutDisplayName: null,
      currentExerciseIndex: 0,
      exercises: [],
      startedAt: null,
      elapsedSeconds: 0,
      isPaused: false,
      totalPausedMs: 0,
      pauseStartedAt: null,
      durationExerciseIndex: null,
      durationRunning: false,
      durationStartedAt: null,
      durationAccumulatedSeconds: 0,

      startSession: (workoutId, exercises, options) =>
        set({
          activeWorkoutId: workoutId,
          workoutDisplayName: options?.workoutName?.trim() || null,
          exercises,
          currentExerciseIndex: 0,
          startedAt: new Date().toISOString(),
          elapsedSeconds: 0,
          isPaused: false,
          totalPausedMs: 0,
          pauseStartedAt: null,
          durationExerciseIndex: null,
          durationRunning: false,
          durationStartedAt: null,
          durationAccumulatedSeconds: 0,
        }),

      updateExercise: (index, updates) =>
        set((state) => ({
          exercises: state.exercises.map((ex, i) =>
            i === index ? { ...ex, ...updates } : ex
          ),
        })),

      goToExercise: (index) =>
        set({
          currentExerciseIndex: index,
          durationExerciseIndex: null,
          durationRunning: false,
          durationStartedAt: null,
          durationAccumulatedSeconds: 0,
        }),

      pauseSession: () =>
        set((state) => {
          if (!state.startedAt || state.isPaused) return state;
          const idx = state.currentExerciseIndex;
          let durationAccumulatedSeconds = state.durationAccumulatedSeconds;
          let durationRunning = state.durationRunning;
          let durationStartedAt = state.durationStartedAt;
          if (
            state.durationExerciseIndex === idx &&
            state.durationRunning &&
            state.durationStartedAt
          ) {
            durationAccumulatedSeconds += Math.floor(
              (Date.now() - new Date(state.durationStartedAt).getTime()) / 1000
            );
            durationRunning = false;
            durationStartedAt = null;
          }
          return {
            isPaused: true,
            pauseStartedAt: new Date().toISOString(),
            durationAccumulatedSeconds,
            durationRunning,
            durationStartedAt,
          };
        }),

      resumeSession: () =>
        set((state) => {
          if (!state.isPaused || !state.pauseStartedAt) {
            return { isPaused: false, pauseStartedAt: null };
          }
          const extra = Date.now() - new Date(state.pauseStartedAt).getTime();
          return {
            isPaused: false,
            pauseStartedAt: null,
            totalPausedMs: state.totalPausedMs + extra,
          };
        }),

      clearSession: () =>
        set({
          activeWorkoutId: null,
          workoutDisplayName: null,
          currentExerciseIndex: 0,
          exercises: [],
          startedAt: null,
          elapsedSeconds: 0,
          isPaused: false,
          totalPausedMs: 0,
          pauseStartedAt: null,
          durationExerciseIndex: null,
          durationRunning: false,
          durationStartedAt: null,
          durationAccumulatedSeconds: 0,
        }),

      syncFromWallClock: () => {
        const state = get();
        const elapsed = computeSessionElapsedSeconds(state);
        set({ elapsedSeconds: elapsed });
      },

      tickElapsed: () => {
        get().syncFromWallClock();
      },

      startDurationSegment: () => {
        const state = get();
        const idx = state.currentExerciseIndex;
        const sameExercise = state.durationExerciseIndex === idx;
        set({
          durationExerciseIndex: idx,
          durationRunning: true,
          durationStartedAt: new Date().toISOString(),
          durationAccumulatedSeconds: sameExercise ? state.durationAccumulatedSeconds : 0,
        });
      },

      pauseDurationSegment: () => {
        const state = get();
        const idx = state.currentExerciseIndex;
        if (state.durationExerciseIndex !== idx || !state.durationRunning) return;
        let acc = state.durationAccumulatedSeconds;
        if (state.durationStartedAt) {
          acc += Math.floor((Date.now() - new Date(state.durationStartedAt).getTime()) / 1000);
        }
        set({
          durationRunning: false,
          durationStartedAt: null,
          durationAccumulatedSeconds: acc,
        });
      },

      resetDurationForExerciseChange: () =>
        set({
          durationExerciseIndex: null,
          durationRunning: false,
          durationStartedAt: null,
          durationAccumulatedSeconds: 0,
        }),
    }),
    {
      name: 'workout-session',
      version: 3,
      migrate: (persisted: unknown, version: number) => {
        let p = (persisted ?? {}) as Record<string, unknown>;
        if (version < 2) {
          p = {
            ...p,
            totalPausedMs: typeof p.totalPausedMs === 'number' ? p.totalPausedMs : 0,
            pauseStartedAt:
              typeof p.pauseStartedAt === 'string' || p.pauseStartedAt === null
                ? p.pauseStartedAt
                : null,
            durationExerciseIndex:
              typeof p.durationExerciseIndex === 'number' || p.durationExerciseIndex === null
                ? p.durationExerciseIndex
                : null,
            durationRunning: typeof p.durationRunning === 'boolean' ? p.durationRunning : false,
            durationStartedAt:
              typeof p.durationStartedAt === 'string' || p.durationStartedAt === null
                ? p.durationStartedAt
                : null,
            durationAccumulatedSeconds:
              typeof p.durationAccumulatedSeconds === 'number' ? p.durationAccumulatedSeconds : 0,
          };
        }
        if (version < 3) {
          p = {
            ...p,
            workoutDisplayName:
              typeof p.workoutDisplayName === 'string' || p.workoutDisplayName === null
                ? p.workoutDisplayName
                : null,
          };
        }
        return p;
      },
    }
  )
);
