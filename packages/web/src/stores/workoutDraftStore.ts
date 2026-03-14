import { create } from 'zustand';
import type { WorkoutExercise } from '@/types';
import type { WorkoutDraft } from '@/types/ui';

interface WorkoutDraftStore {
  draft: WorkoutDraft | null;
  setDraft: (draft: WorkoutDraft) => void;
  updateExerciseInDraft: (index: number, updates: Partial<WorkoutExercise>) => void;
  removeExerciseFromDraft: (index: number) => void;
  reorderExercisesInDraft: (fromIndex: number, toIndex: number) => void;
  clearDraft: () => void;
}

export const useWorkoutDraftStore = create<WorkoutDraftStore>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  updateExerciseInDraft: (index, updates) =>
    set((state) => {
      if (!state.draft) return state;
      const exercises = state.draft.exercises.map((ex, i) =>
        i === index ? { ...ex, ...updates } : ex
      );
      return { draft: { ...state.draft, exercises } };
    }),
  removeExerciseFromDraft: (index) =>
    set((state) => {
      if (!state.draft) return state;
      const exercises = state.draft.exercises.filter((_, i) => i !== index);
      return { draft: { ...state.draft, exercises } };
    }),
  reorderExercisesInDraft: (fromIndex, toIndex) =>
    set((state) => {
      if (!state.draft) return state;
      const exercises = [...state.draft.exercises];
      const [removed] = exercises.splice(fromIndex, 1);
      exercises.splice(toIndex, 0, removed);
      const withOrder = exercises.map((ex, i) => ({ ...ex, orderIndex: i }));
      return { draft: { ...state.draft, exercises: withOrder } };
    }),
  clearDraft: () => set({ draft: null }),
}));
