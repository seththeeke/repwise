import type { WorkoutExercise, WorkoutSource, PermissionType } from '../../../lambdas/shared/src/models';
import type { ExerciseModality } from '../../../lambdas/shared/src/enums';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface SelectedGym {
  gymId: string;
  name: string;
  equipmentTypes: string[];
}

export interface WorkoutDraft {
  exercises: WorkoutExercise[];
  source: WorkoutSource;
  permissionType: PermissionType;
  aiPrompt?: string;
  selectedGym?: SelectedGym | null;
}

export interface ExerciseFilterState {
  muscleGroup?: string;
  equipment?: string;
  modality?: ExerciseModality;
  search?: string;
}

export type PeriodFilter = '30d' | '90d' | '180d' | 'all';
