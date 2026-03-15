import { apiClient } from './client';
import type { WorkoutInstance, WorkoutExercise, PermissionType, WorkoutStatus } from '@/types';
import type { WorkoutDraft } from '@/types/ui';

interface ListWorkoutsParams {
  status?: WorkoutStatus;
  limit?: number;
  nextToken?: string;
}

interface PatchWorkoutBody {
  exercises?: Array<Partial<WorkoutExercise> & { exerciseId: string }>;
  notes?: string;
  permissionType?: PermissionType;
  status?: WorkoutStatus;
}

export const workoutsApi = {
  create: (body: {
    exercises: WorkoutExercise[];
    source?: string;
    permissionType?: string;
    gymId?: string;
    gymName?: string;
  }) => apiClient.post<WorkoutInstance>('/workout-instances', body).then((r) => r.data),

  /**
   * Legacy: POST with aiPrompt to API Gateway. Backend returns 400; use the AI stream endpoint
   * (streamWorkoutGeneration in api/aiWorkoutStream.ts) with VITE_AI_WORKOUT_STREAM_URL instead.
   */
  generateFromPrompt: (aiPrompt: string) =>
    apiClient
      .post<{ suggestedExercises: WorkoutExercise[] }>('/workout-instances', {
        exercises: [],
        aiPrompt,
      })
      .then((r) => r.data),

  list: (params?: ListWorkoutsParams) =>
    apiClient
      .get<{ items: WorkoutInstance[]; nextToken?: string }>('/workout-instances', { params })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<WorkoutInstance>(`/workout-instances/${id}`).then((r) => r.data),

  patch: (id: string, body: PatchWorkoutBody) =>
    apiClient.patch<WorkoutInstance>(`/workout-instances/${id}`, body).then((r) => r.data),

  complete: (id: string) =>
    apiClient
      .patch<WorkoutInstance>(`/workout-instances/${id}`, { status: 'completed' })
      .then((r) => r.data),

  cancel: (id: string) =>
    apiClient
      .patch<WorkoutInstance>(`/workout-instances/${id}`, { status: 'cancelled' })
      .then((r) => r.data),
};
