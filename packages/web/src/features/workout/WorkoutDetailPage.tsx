import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { workoutsApi } from '@/api/workouts';
import { useWorkoutDraftStore } from '@/stores/workoutDraftStore';
import { WorkoutSource, PermissionType } from '@/types';
import { ChevronLeft, Dumbbell, Clock, RotateCcw } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toString();
}

export function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setDraft = useWorkoutDraftStore((s) => s.setDraft);
  const { data: workout, isLoading, error } = useQuery({
    queryKey: ['workout', id],
    queryFn: () => workoutsApi.getById(id!),
    enabled: !!id,
  });

  if (isLoading || !workout) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <p className="text-red-600 dark:text-red-400 text-center mb-4">
          Could not load workout.
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-primary font-medium"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const loadIntoBuilder = () => {
    const exercises = (workout.exercises ?? []).map((ex, i) => ({
      ...ex,
      orderIndex: i,
      skipped: false,
    }));
    setDraft({
      exercises,
      source: WorkoutSource.MANUAL,
      permissionType: (workout.permissionType as PermissionType) ?? PermissionType.FOLLOWERS_ONLY,
    });
    navigate('/workout/review');
  };

  const completedExercises = workout.exercises?.filter((e) => !e.skipped) ?? [];
  const totalVolume =
    completedExercises.reduce((sum, e) => {
      if (e.sets != null && e.reps != null && e.weight != null)
        return sum + e.sets * e.reps * e.weight;
      return sum;
    }, 0) ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-8">
      <div className="bg-gradient-to-b from-primary to-primary-dark px-4 pt-12 pb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Workout Details</h1>
          <div className="w-9" />
        </div>
        <p className="text-white/90 text-sm">
          {workout.completedAt
            ? formatDate(workout.completedAt)
            : formatDate(workout.startedAt)}
        </p>
      </div>

      <div className="px-4 -mt-2 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {workout.durationMinutes ?? 0}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">minutes</p>
          </div>
          <div className="flex-1 text-right">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatVolume(totalVolume)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">total volume (lbs)</p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadIntoBuilder}
          className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border-2 border-primary text-primary font-semibold hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Load into workout builder
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <h2 className="px-4 py-3 font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700">
            Exercises
          </h2>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {(workout.exercises ?? []).map((ex, i) => {
              const isDuration = ex.modality === 'duration';
              const leftLabel = ex.skipped
                ? 'Skipped'
                : isDuration
                  ? null
                  : `${ex.sets ?? 0} × ${ex.reps ?? 0}`;
              const rightValue = ex.skipped
                ? null
                : isDuration
                  ? `${ex.durationSeconds ?? 0}s`
                  : ex.weight != null
                    ? `${ex.weight} lbs`
                    : null;
              return (
                <li
                  key={`${ex.exerciseId}-${i}`}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {ex.exerciseName}
                    </p>
                    {leftLabel != null && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {leftLabel}
                      </p>
                    )}
                  </div>
                  {rightValue != null && (
                    <div className="flex-shrink-0 rounded-lg bg-primary/15 dark:bg-primary/25 px-3 py-1.5">
                      <span className="text-base font-semibold text-primary-dark dark:text-primary">
                        {rightValue}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
