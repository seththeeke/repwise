import { apiClient } from './client';
import type { Goal, GoalStatus, GoalType, GoalTimeframe } from '@/types';

interface CreateGoalBody {
  type: GoalType;
  title: string;
  description?: string;
  timeframe: GoalTimeframe;
  targetValue: number;
  unit?: string;
  exerciseId?: string;
}

export interface GoalSuggestion {
  type: GoalType;
  title: string;
  timeframe: GoalTimeframe;
  targetValue: number;
  unit?: string;
}

export const goalsApi = {
  list: (status?: GoalStatus) =>
    apiClient.get<Goal[]>('/goals/me', { params: { status } }).then((r) => r.data),

  create: (body: CreateGoalBody) =>
    apiClient.post<Goal>('/goals/me', body).then((r) => r.data),

  suggestFromText: (freeText: string) =>
    apiClient
      .post<{ suggestions: GoalSuggestion[] }>('/goals/me/suggest', { freeText })
      .then((r) => r.data),

  delete: (goalId: string) =>
    apiClient.delete(`/goals/me/${goalId}`).then(() => undefined),
};
