import { apiClient } from './client';

export interface BuilderAiConfig {
  bedrockModelId: string;
  intentPromptTemplate: string;
  selectExercisesPromptTemplate: string;
  regeneratePromptTemplate: string;
  estimatedPricePerRequest?: string;
}

export const builderAiConfigApi = {
  get: () =>
    apiClient
      .get<BuilderAiConfig>('/admin/builder-ai-config')
      .then((r) => r.data),

  put: (updates: Partial<BuilderAiConfig>) =>
    apiClient
      .put<BuilderAiConfig>('/admin/builder-ai-config', updates)
      .then((r) => r.data),
};

