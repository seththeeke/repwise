import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkoutExercise } from '@/types';

interface WorkoutSessionStore {
  activeWorkoutId: string | null;
  currentExerciseIndex: number;
  exercises: WorkoutExercise[];
  startedAt: string | null;
  elapsedSeconds: number;
  isPaused: boolean;

  startSession: (workoutId: string, exercises: WorkoutExercise[]) => void;
  updateExercise: (index: number, updates: Partial<WorkoutExercise>) => void;
  goToExercise: (index: number) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  clearSession: () => void;
}

export const useWorkoutSessionStore = create<WorkoutSessionStore>()(
  persist(
    (set) => ({
      activeWorkoutId: null,
      currentExerciseIndex: 0,
      exercises: [],
      startedAt: null,
      elapsedSeconds: 0,
      isPaused: false,

      startSession: (workoutId, exercises) =>
        set({
          activeWorkoutId: workoutId,
          exercises,
          currentExerciseIndex: 0,
          startedAt: new Date().toISOString(),
          elapsedSeconds: 0,
          isPaused: false,
        }),

      updateExercise: (index, updates) =>
        set((state) => ({
          exercises: state.exercises.map((ex, i) =>
            i === index ? { ...ex, ...updates } : ex
          ),
        })),

      goToExercise: (index) => set({ currentExerciseIndex: index }),

      pauseSession: () => set({ isPaused: true }),

      resumeSession: () => set({ isPaused: false }),

      clearSession: () =>
        set({
          activeWorkoutId: null,
          currentExerciseIndex: 0,
          exercises: [],
          startedAt: null,
          elapsedSeconds: 0,
          isPaused: false,
        }),
    }),
    { name: 'workout-session' }
  )
);
