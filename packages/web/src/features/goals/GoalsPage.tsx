import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { goalsApi } from '@/api/goals';
import { GoalStatus, type Goal } from '@/types';
import { ChevronLeft } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

export function GoalsPage() {
  const navigate = useNavigate();
  const { data: goalsRes, isLoading } = useQuery({
    queryKey: ['goals', GoalStatus.ACTIVE],
    queryFn: () => goalsApi.list(GoalStatus.ACTIVE),
  });

  const list: Goal[] = Array.isArray(goalsRes)
    ? goalsRes
    : Array.isArray((goalsRes as { items?: Goal[] })?.items)
      ? (goalsRes as { items: Goal[] }).items
      : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-b from-primary to-primary-dark px-4 pt-12 pb-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Goals</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No goals yet. Create one to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((goal) => (
              <div
                key={goal.goalId}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
              >
                <p className="font-medium text-gray-900 dark:text-white">
                  {goal.title}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {goal.currentValue} / {goal.targetValue} {goal.unit ?? ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
