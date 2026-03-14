import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Play } from 'lucide-react';
import { useWorkoutDraftStore } from '@/stores/workoutDraftStore';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import { workoutsApi } from '@/api/workouts';
import { WorkoutSource, PermissionType } from '@/types';
import { ReviewExerciseRow } from './ReviewExerciseRow';
import { exercisesApi } from '@/api/exercises';
import { useQuery } from '@tanstack/react-query';

export function ReviewWorkoutScreen() {
  const navigate = useNavigate();
  const draft = useWorkoutDraftStore((s) => s.draft);
  const setDraft = useWorkoutDraftStore((s) => s.setDraft);
  const updateExerciseInDraft = useWorkoutDraftStore((s) => s.updateExerciseInDraft);
  const removeExerciseFromDraft = useWorkoutDraftStore((s) => s.removeExerciseFromDraft);
  const clearDraft = useWorkoutDraftStore((s) => s.clearDraft);
  const startSession = useWorkoutSessionStore((s) => s.startSession);

  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);

  const { data: catalogExercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => exercisesApi.list({}),
    enabled: swapIndex !== null,
  });

  const exercises = draft?.exercises ?? [];
  const isAI = draft?.source === WorkoutSource.AI_GENERATED;

  // Don't redirect to builder when we're in the middle of starting (clearDraft causes empty draft before navigate completes)
  if (!draft || exercises.length === 0) {
    if (!starting) navigate('/workout/new');
    return null;
  }

  const swapOptions = Array.isArray(catalogExercises)
    ? catalogExercises.filter((c) => !exercises.some((e) => e.exerciseId === c.exerciseId))
    : [];

  const handleStartWorkout = async () => {
    setStarting(true);
    try {
      const created = await workoutsApi.create({
        exercises,
        source: draft.source === WorkoutSource.AI_GENERATED ? WorkoutSource.AI_GENERATED : WorkoutSource.MANUAL,
        permissionType: draft.permissionType ?? PermissionType.FOLLOWERS_ONLY,
      });
      startSession(created.workoutInstanceId, created.exercises);
      clearDraft();
      navigate(`/workout/execute/${created.workoutInstanceId}`);
    } catch {
      setStarting(false);
    }
  };

  const handleChooseSwap = (exerciseId: string, name: string) => {
    if (swapIndex === null) return;
    const ex = Array.isArray(catalogExercises)
      ? (catalogExercises as Array<{ exerciseId: string; modality: string; defaultSets?: number; defaultReps?: number; defaultDurationSeconds?: number }>).find(
          (c) => c.exerciseId === exerciseId
        )
      : null;
    const modality = ex?.modality ?? 'sets_reps';
    const newEx = {
      exerciseId,
      exerciseName: name,
      modality: modality as 'sets_reps' | 'duration' | 'burnout',
      sets: modality === 'duration' ? undefined : (ex?.defaultSets ?? 3),
      reps: modality === 'duration' ? undefined : (ex?.defaultReps ?? 8),
      durationSeconds: modality === 'duration' ? (ex?.defaultDurationSeconds ?? 60) : undefined,
      skipped: false,
      orderIndex: swapIndex,
    };
    updateExerciseInDraft(swapIndex, newEx);
    setSwapIndex(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button
          type="button"
          onClick={() => navigate(isAI ? '/workout/new/ai' : '/workout/new/manual')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Review Workout</h1>
      </div>

      {isAI && (
        <div className="p-4 bg-gradient-to-r from-primary to-primary-dark">
          <div className="flex items-center gap-2 text-white mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">AI Generated Workout</span>
          </div>
          <p className="text-violet-200 text-sm">Edit sets/reps or remove exercises, then start.</p>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 pb-28 space-y-3">
        {exercises.map((exercise, index) => (
          <ReviewExerciseRow
            key={`${exercise.exerciseId}-${index}`}
            exercise={exercise}
            index={index}
            selected={false}
            onToggleSelect={() => {}}
            onUpdate={(updates) => updateExerciseInDraft(index, updates)}
            onRemove={() => removeExerciseFromDraft(index)}
            onSwap={() => setSwapIndex(index)}
            swapMode={swapIndex === index}
            onCloseSwap={() => setSwapIndex(null)}
            swapOptions={swapOptions.map((c: { exerciseId: string; name: string; muscleGroups: string[] }) => ({
              exerciseId: c.exerciseId,
              name: c.name,
              muscleGroups: c.muscleGroups ?? [],
            }))}
            onChooseSwap={handleChooseSwap}
          />
        ))}
      </div>

      {/* Fixed Start Workout bar - always visible without scrolling */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur supports-[backdrop-filter]:bg-white dark:supports-[backdrop-filter]:bg-gray-800">
        <button
          type="button"
          onClick={handleStartWorkout}
          disabled={starting || exercises.length === 0}
          className="w-full py-4 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          {starting ? 'Starting...' : `Start Workout (${exercises.length} exercises)`}
        </button>
      </div>
    </div>
  );
}
