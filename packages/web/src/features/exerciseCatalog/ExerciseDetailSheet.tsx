import { useQuery } from '@tanstack/react-query';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { exercisesApi } from '@/api/exercises';
import { metricsApi } from '@/api/metrics';
import { Spinner } from '@/components/ui/Spinner';

interface ExerciseDetailSheetProps {
  exerciseId: string;
  onClose: () => void;
}

export function ExerciseDetailSheet({ exerciseId, onClose }: ExerciseDetailSheetProps) {
  const { data: exercise, isLoading: exerciseLoading } = useQuery({
    queryKey: ['exercise', exerciseId],
    queryFn: () => exercisesApi.getById(exerciseId),
    enabled: !!exerciseId,
  });

  const { data: metrics } = useQuery({
    queryKey: ['metrics', 'exercise', exerciseId],
    queryFn: () => metricsApi.getExercise(exerciseId),
    enabled: !!exerciseId,
  });

  return (
    <BottomSheet open={!!exerciseId} onClose={onClose} title={exercise?.name ?? 'Exercise'}>
      {exerciseLoading || !exercise ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Muscle groups</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {(exercise.muscleGroups ?? []).join(', ')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Equipment</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {(exercise.equipment ?? []).join(', ')}
            </p>
          </div>
          {exercise.instructions && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Instructions</p>
              <p className="text-gray-900 dark:text-white text-sm">{exercise.instructions}</p>
            </div>
          )}
          {metrics && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Your stats</p>
              <p className="font-medium text-gray-900 dark:text-white">
                Max: {metrics.maxWeight} {metrics.maxWeightUnit === 'LBS' ? 'lbs' : 'kg'} ·{' '}
                {metrics.totalSessions} sessions
              </p>
              {metrics.lastPerformedDate && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Last: {new Date(metrics.lastPerformedDate).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
