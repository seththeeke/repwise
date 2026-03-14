import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { metricsApi } from '@/api/metrics';
import type { PeriodFilter } from '@/types/ui';
import { Spinner } from '@/components/ui/Spinner';

const PERIODS: { value: PeriodFilter; label: string }[] = [
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '180d', label: '180d' },
  { value: 'all', label: 'All' },
];

export function ExerciseMetricsDetailPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodFilter>('90d');

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['metrics', 'exercise', exerciseId, period],
    queryFn: () => metricsApi.getExercise(exerciseId!, period),
    enabled: !!exerciseId,
  });

  if (!exerciseId) {
    navigate('/metrics');
    return null;
  }

  if (isLoading || !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="bg-gradient-to-b from-primary to-primary-dark px-4 pt-12 pb-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white truncate max-w-[60%]">
            {metrics.exerciseName}
          </h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                period === p.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Max weight</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.maxWeight} {metrics.maxWeightUnit === 'LBS' ? 'lbs' : 'kg'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {metrics.totalSessions} sessions · Last: {new Date(metrics.lastPerformedDate).toLocaleDateString()}
          </p>
        </div>

        {metrics.personalRecordHistory && metrics.personalRecordHistory.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">PR History</h2>
            <div className="space-y-2">
              {metrics.personalRecordHistory.map((pr: { weight: number; weightUnit: string; achievedAt: string }, i: number) => (
                <div
                  key={i}
                  className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <span className="text-gray-900 dark:text-white font-medium">
                    {pr.weight} {pr.weightUnit === 'LBS' ? 'lbs' : 'kg'}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(pr.achievedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
