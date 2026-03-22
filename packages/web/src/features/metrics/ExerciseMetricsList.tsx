import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { metricsApi } from '@/api/metrics';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDevToolsStore } from '@/stores/devToolsStore';

export function ExerciseMetricsList() {
  const navigate = useNavigate();
  const simulateLoading = useDevToolsStore((s) => s.simulateLoading);
  const { data: list = [], isLoading } = useQuery({
    queryKey: ['metrics', 'exercises'],
    queryFn: () => metricsApi.listExercises(),
  });

  const exercises = Array.isArray(list) ? list : [];

  if (isLoading || simulateLoading) {
    return (
      <div className="space-y-2" aria-label="Loading">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {exercises.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="w-7 h-7" />}
          heading="No exercise history yet"
          subtext="Complete workouts to see your metrics."
        />
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
