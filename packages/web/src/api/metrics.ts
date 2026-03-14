import { apiClient } from './client';
import type { GlobalMetrics, ExerciseMetrics } from '@/types';
import type { PeriodFilter } from '@/types/ui';

export const metricsApi = {
  getGlobal: () =>
    apiClient.get<GlobalMetrics>('/metrics/me/global').then((r) => r.data),

  listExercises: () =>
    apiClient.get<ExerciseMetrics[]>('/metrics/me/exercises').then((r) => r.data),

  getExercise: (exerciseId: string, period?: PeriodFilter) =>
    apiClient
      .get<ExerciseMetrics>(`/metrics/me/exercises/${exerciseId}`, { params: { period } })
      .then((r) => r.data),
};
