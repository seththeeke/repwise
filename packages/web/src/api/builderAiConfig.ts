import { apiClient } from './client';

export interface BuilderAiConfig {
  bedrockModelId: string;
  intentPromptTemplate: string;
  selectExercisesPromptTemplate: string;
  regeneratePromptTemplate: string;
  estimatedPricePerRequest?: string;
}

export interface TokenUsageByModel {
  invocationCount: number;
  inputTokens: number;
  outputTokens: number;
  fullCount: number;
  regenerateCount: number;
}

export interface TokenUsageResponse {
  byModel: Record<string, TokenUsageByModel>;
  totals: {
    invocationCount: number;
    inputTokens: number;
    outputTokens: number;
  };
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

  getUsage: (params?: { modelIds?: string }) =>
    apiClient
      .get<TokenUsageResponse>('/admin/builder-ai-config/usage', {
        params: params?.modelIds ? { modelIds: params.modelIds } : undefined,
      })
      .then((r) => r.data),
};

