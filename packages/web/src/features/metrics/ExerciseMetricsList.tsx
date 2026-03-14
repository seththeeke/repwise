import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { metricsApi } from '@/api/metrics';
import { Spinner } from '@/components/ui/Spinner';

export function ExerciseMetricsList() {
  const navigate = useNavigate();
  const { data: list = [], isLoading } = useQuery({
    queryKey: ['metrics', 'exercises'],
    queryFn: () => metricsApi.listExercises(),
  });

  const exercises = Array.isArray(list) ? list : [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {exercises.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No exercise history yet. Complete workouts to see your metrics.
        </p>
      ) : (
        exercises.map((em: { exerciseId: string; exerciseName: string; maxWeight: number; maxWeightUnit: string; totalSessions: number; lastPerformedDate?: string }) => (
          <button
            key={em.exerciseId}
            type="button"
            onClick={() => navigate(`/metrics/exercises/${em.exerciseId}`)}
            className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{em.exerciseName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {em.totalSessions} sessions
                  {em.lastPerformedDate
                    ? ` · Last: ${new Date(em.lastPerformedDate).toLocaleDateString()}`
                    : ''}
                </p>
              </div>
              <p className="font-bold text-gray-900 dark:text-white">
                {em.maxWeight} {em.maxWeightUnit === 'LBS' ? 'lbs' : 'kg'}
              </p>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
