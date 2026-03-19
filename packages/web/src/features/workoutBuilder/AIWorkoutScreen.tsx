import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Wand2, Sparkles, Check } from 'lucide-react';
import {
  streamWorkoutGeneration,
  AI_PROGRESS_STEPS,
  type ProgressStep,
} from '@/api/aiWorkoutStream';
import { gymsApi } from '@/api/gyms';
import { useWorkoutDraftStore } from '@/stores/workoutDraftStore';
import { QuickPromptChips } from './QuickPromptChips';
import { WorkoutSource, PermissionType } from '@/types';

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 8;
const DEFAULT_DURATION = 60;

type LocationGym = { gymId: string; name: string; equipmentTypes: string[] };

export function AIWorkoutScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const setDraft = useWorkoutDraftStore((s) => s.setDraft);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState<ProgressStep | null>(null);

  const { data: gymsData } = useQuery({
    queryKey: ['gyms'],
    queryFn: () => gymsApi.list(),
  });
  const gyms = gymsData?.gyms ?? [];
  const defaultGymId = gymsData?.defaultGymId ?? null;
  const gymFromState = (location.state as { gym?: LocationGym } | null)?.gym;
  const defaultGym =
    gymFromState
      ? { gymId: gymFromState.gymId, name: gymFromState.name, equipmentTypes: gymFromState.equipmentTypes ?? [] }
      : gyms.find((g) => g.gymId === defaultGymId) ?? gyms[0];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setError(null);
    setLoading(true);
    setProgressStep(null);
    const builderSessionId = crypto.randomUUID();
    try {
      await streamWorkoutGeneration(
        prompt.trim(),
        {
          onProgress: (step) => setProgressStep(step),
          onComplete: (suggested) => {
            if (suggested.length === 0) {
              setError('No exercises generated. Try a different prompt.');
              setLoading(false);
              setProgressStep(null);
              return;
            }
            const exercises = suggested.map((e, i) => ({
              ...e,
              sets: e.sets ?? DEFAULT_SETS,
              reps: e.reps ?? DEFAULT_REPS,
              durationSeconds: e.durationSeconds ?? DEFAULT_DURATION,
              skipped: false,
              orderIndex: i,
            }));
            setDraft({
              exercises,
              source: WorkoutSource.AI_GENERATED,
              permissionType: PermissionType.FOLLOWERS_ONLY,
              aiPrompt: prompt.trim(),
              builderSessionId,
              selectedGym: defaultGym
                ? { gymId: defaultGym.gymId, name: defaultGym.name, equipmentTypes: defaultGym.equipmentTypes ?? [] }
                : null,
            });
            setLoading(false);
            setProgressStep(null);
            navigate('/workout/review');
          },
          onError: (msg) => {
            setError(msg);
            setLoading(false);
            setProgressStep(null);
          },
        },
        { equipmentTypes: defaultGym?.equipmentTypes, builderSessionId }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation.');
      setLoading(false);
      setProgressStep(null);
    }
  };

  const stepIndex = progressStep
    ? AI_PROGRESS_STEPS.findIndex((s) => s.step === progressStep)
    : -1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button
          type="button"
          onClick={() => navigate('/workout/new')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          AI Workout
        </h1>
      </div>

      <div className="flex-1 flex flex-col p-4">
        {loading && progressStep ? (
          <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/30 animate-pulse">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
              Building your workout
            </h2>
            <ul className="w-full space-y-3">
              {AI_PROGRESS_STEPS.map((s, i) => {
                const done = stepIndex > i;
                const current = stepIndex === i;
                return (
                  <li
                    key={s.step}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      current
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {done ? (
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </span>
                    ) : (
                      <span
                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                          current
                            ? 'bg-primary text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                        }`}
                      >
                        {i + 1}
                      </span>
                    )}
                    <span
                      className={
                        done
                          ? 'text-gray-500 dark:text-gray-400 line-through'
                          : current
                            ? 'text-gray-900 dark:text-white font-medium'
                            : 'text-gray-500 dark:text-gray-400'
                      }
                    >
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/30">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              What would you like to train?
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center text-sm">
              Describe your goals, target muscles, or how much time you have
            </p>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 45 minute upper body push workout focusing on chest and shoulders..."
              className="w-full h-32 p-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={loading}
            />

            <div className="mt-4">
              <QuickPromptChips onSelect={(text) => setPrompt((p) => (p ? `${p} ${text}` : text))} />
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!prompt.trim() || loading}
          className="w-full py-4 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2"
        >
          <Wand2 className="w-5 h-5" />
          {loading ? 'Generating...' : 'Generate Workout'}
        </button>
      </div>
    </div>
  );
}
