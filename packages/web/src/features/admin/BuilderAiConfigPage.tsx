import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, RefreshCw, Save } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import {
  builderAiConfigApi,
  type BuilderAiConfig,
  type TokenUsageResponse,
} from '@/api/builderAiConfig';

const AMAZON_BEDROCK_CONVERSE_MODELS: Array<{ label: string; value: string }> = [
  { label: 'amazon.nova-micro-v1:0 (fast)', value: 'amazon.nova-micro-v1:0' },
  { label: 'amazon.nova-lite-v1:0 (balanced)', value: 'amazon.nova-lite-v1:0' },
  { label: 'amazon.nova-pro-v1:0 (high quality)', value: 'amazon.nova-pro-v1:0' },
  { label: 'amazon.nova-premier-v1:0 (Amazon best)', value: 'amazon.nova-premier-v1:0' },
  { label: 'anthropic.claude-3-5-haiku (fast, capable)', value: 'anthropic.claude-3-5-haiku-20241022-v1:0' },
  { label: 'anthropic.claude-sonnet-4-5 (top tier)', value: 'anthropic.claude-sonnet-4-5-20250929-v1:0' },
  { label: 'anthropic.claude-opus-4-5 (frontier)', value: 'anthropic.claude-opus-4-5-20251101-v1:0' },
];

/** Rough per-1M-token pricing (USD). Used for estimate only. */
const PRICE_PER_1M: Record<string, { input: number; output: number }> = {
  'amazon.nova-micro-v1:0': { input: 0.035, output: 0.14 },
  'amazon.nova-lite-v1:0': { input: 0.04, output: 0.16 },
  'amazon.nova-pro-v1:0': { input: 0.08, output: 0.32 },
  'amazon.nova-premier-v1:0': { input: 0.3, output: 1.2 },
  'anthropic.claude-3-5-haiku-20241022-v1:0': { input: 0.8, output: 4 },
  'anthropic.claude-sonnet-4-5-20250929-v1:0': { input: 3, output: 15 },
  'anthropic.claude-opus-4-5-20251101-v1:0': { input: 15, output: 75 },
};

function estimateCost(usage: TokenUsageResponse): number {
  let total = 0;
  for (const [modelId, stats] of Object.entries(usage.byModel)) {
    const price = PRICE_PER_1M[modelId];
    if (price) {
      total += (stats.inputTokens / 1e6) * price.input;
      total += (stats.outputTokens / 1e6) * price.output;
    }
  }
  return total;
}

function isAxiosErrorWithStatus(err: unknown, status: number): boolean {
  const anyErr = err as any;
  return anyErr?.response?.status === status;
}

export function BuilderAiConfigPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch: refetchConfig,
  } = useQuery({
    queryKey: ['builderAiConfig'],
    queryFn: builderAiConfigApi.get,
    retry: 0,
  });

  const {
    data: usageData,
    isLoading: usageLoading,
    refetch: refetchUsage,
  } = useQuery({
    queryKey: ['builderAiConfigUsage'],
    queryFn: builderAiConfigApi.getUsage,
    retry: 0,
  });

  const [draft, setDraft] = useState<BuilderAiConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const statusMessage = useMemo(() => {
    if (!error) return null;
    if (isAxiosErrorWithStatus(error, 403)) {
      return 'Path not found';
    }
    return 'Failed to load builder AI configuration.';
  }, [error]);

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setSaveError(null);
    try {
      await builderAiConfigApi.put(draft);
      queryClient.invalidateQueries({ queryKey: ['builderAiConfig'] });
    } catch (err) {
      if (isAxiosErrorWithStatus(err, 403)) {
        setSaveError(
          'Not authorized. Ask an admin to add you to the `builder-admin` Cognito group.'
        );
      } else {
        setSaveError('Failed to save configuration.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !draft) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Spinner />
      </div>
    );
  }

  if (statusMessage) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Builder AI Configuration
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            {statusMessage === 'Path not found'
              ? 'You may not have access to this page.'
              : statusMessage}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => refetchConfig()}
              className="flex-1 py-2 px-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="py-2 px-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-b from-primary to-primary-dark px-4 pt-10 pb-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1" />
          <div className="w-9" />
        </div>
        <h1 className="text-lg font-semibold text-white mt-3">
          Workout Builder AI Config
        </h1>
        <p className="text-sm text-white/80 mt-2 max-w-2xl">
          Changes apply globally (all users). Templates support placeholders
          used by the backend render logic.
        </p>
      </div>

      <div className="px-4 py-6 space-y-4">
        {saveError && (
          <div className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm">
            {saveError}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Bedrock modelId
          </p>
          <select
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            value={draft.bedrockModelId}
            onChange={(e) =>
              setDraft({ ...draft, bedrockModelId: e.target.value })
            }
          >
            {AMAZON_BEDROCK_CONVERSE_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Estimated price (per request, USD)
          </p>
          <input
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            value={draft.estimatedPricePerRequest ?? ''}
            onChange={(e) =>
              setDraft({ ...draft, estimatedPricePerRequest: e.target.value })
            }
            placeholder="e.g. 0.02"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Optional informational value for admins (not used by the backend).
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Select exercises prompt template
          </p>
          <textarea
            className="w-full min-h-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            value={draft.selectExercisesPromptTemplate}
            onChange={(e) =>
              setDraft({
                ...draft,
                selectExercisesPromptTemplate: e.target.value,
              })
            }
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Placeholders: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{"{{USER_PROMPT}}"}</code>,{' '}
            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{"{{CATALOG}}"}</code>,{' '}
            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{"{{EQUIPMENT_HINT}}"}</code>,{' '}
            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{"{{GOALS_JSON}}"}</code>,{' '}
            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{"{{RECENT_JSON}}"}</code>
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Regenerate prompt template
          </p>
          <textarea
            className="w-full min-h-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            value={draft.regeneratePromptTemplate}
            onChange={(e) =>
              setDraft({
                ...draft,
                regeneratePromptTemplate: e.target.value,
              })
            }
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Placeholders: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{"{{COUNT}}"}</code>,{' '}
            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{"{{USER_PROMPT}}"}</code>,{' '}
            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{"{{CATALOG}}"}</code>,{' '}
            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{"{{EXCLUDE_IDS}}"}</code>
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save changes'}
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Token usage
            </p>
            <button
              type="button"
              onClick={() => refetchUsage()}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Refresh usage"
            >
              <RefreshCw
                className={`w-4 h-4 text-gray-500 ${usageLoading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
          {usageLoading ? (
            <div className="py-4 flex justify-center">
              <Spinner />
            </div>
          ) : usageData ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Totals:</span>{' '}
                {usageData.totals.invocationCount.toLocaleString()} invocations,{' '}
                {usageData.totals.inputTokens.toLocaleString()} input tokens,{' '}
                {usageData.totals.outputTokens.toLocaleString()} output tokens
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Est. cost:</span>{' '}
                ~${estimateCost(usageData).toFixed(4)} USD
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left py-2 font-medium">Model</th>
                      <th className="text-right py-2">Invocations</th>
                      <th className="text-right py-2">Input</th>
                      <th className="text-right py-2">Output</th>
                      <th className="text-right py-2">Full</th>
                      <th className="text-right py-2">Regen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(usageData.byModel)
                      .filter(([, s]) => s.invocationCount > 0)
                      .map(([modelId, stats]) => (
                        <tr
                          key={modelId}
                          className="border-b border-gray-100 dark:border-gray-700"
                        >
                          <td className="py-2 truncate max-w-[180px]" title={modelId}>
                            {modelId.split('/').pop() ?? modelId}
                          </td>
                          <td className="text-right py-2">
                            {stats.invocationCount.toLocaleString()}
                          </td>
                          <td className="text-right py-2">
                            {stats.inputTokens.toLocaleString()}
                          </td>
                          <td className="text-right py-2">
                            {stats.outputTokens.toLocaleString()}
                          </td>
                          <td className="text-right py-2">{stats.fullCount}</td>
                          <td className="text-right py-2">
                            {stats.regenerateCount}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {Object.values(usageData.byModel).every((s) => s.invocationCount === 0) && (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                  No usage recorded yet.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
              Could not load usage.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

