import { apiClient } from './client';
import type { ExerciseCatalogItem } from '@/types';
import type { ExerciseFilterState } from '@/types/ui';

export const exercisesApi = {
  list: (filters?: ExerciseFilterState) =>
    apiClient
      .get<ExerciseCatalogItem[]>('/exercises', {
        params: {
          muscleGroup: filters?.muscleGroup,
          equipment: filters?.equipment,
          modality: filters?.modality,
          search: filters?.search,
        },
      })
      .then((r) => r.data),

  getById: (exerciseId: string) =>
    apiClient
      .get<ExerciseCatalogItem>(`/exercises/${exerciseId}`)
      .then((r) => r.data),
};
