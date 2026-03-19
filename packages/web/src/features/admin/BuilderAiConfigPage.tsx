import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Save } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import {
  builderAiConfigApi,
  type BuilderAiConfig,
} from '@/api/builderAiConfig';

const AMAZON_BEDROCK_CONVERSE_MODELS: Array<{ label: string; value: string }> = [
  { label: 'amazon.nova-micro-v1:0 (fast)', value: 'amazon.nova-micro-v1:0' },
  { label: 'amazon.nova-lite-v1:0 (balanced)', value: 'amazon.nova-lite-v1:0' },
  { label: 'amazon.nova-pro-v1:0 (best quality)', value: 'amazon.nova-pro-v1:0' },
];

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
            Intent prompt template
          </p>
          <textarea
            className="w-full min-h-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            value={draft.intentPromptTemplate}
            onChange={(e) =>
              setDraft({ ...draft, intentPromptTemplate: e.target.value })
            }
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Placeholder: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{"{{USER_PROMPT}}"}</code>
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
            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{"{{CONSTRAINTS_TEXT}}"}</code>,{' '}
            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{"{{CATALOG_JSON}}"}</code>,{' '}
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
            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{"{{MUSCLE_GROUP}}"}</code>,{' '}
            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{"{{EQUIPMENT_TYPES}}"}</code>,{' '}
            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{"{{CATALOG_JSON}}"}</code>
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
      </div>
    </div>
  );
}

