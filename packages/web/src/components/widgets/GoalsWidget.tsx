import { Target, ChevronRight } from 'lucide-react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { Goal } from '@/types';

interface GoalsWidgetProps {
  goals: Goal[];
  onSeeAll: () => void;
  onAddGoal: () => void;
}

export function GoalsWidget({
  goals,
  onSeeAll,
  onAddGoal,
}: GoalsWidgetProps) {
  const goalsList = Array.isArray(goals) ? goals : [];
  const activeGoals = goalsList.filter((g) => g.status === 'active').slice(0, 2);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Goals
          </h2>
        </div>
        {activeGoals.length > 0 ? (
          <button
            type="button"
            onClick={onSeeAll}
            className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"
          >
            See All <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          onAddGoal && (
            <button
              type="button"
              onClick={onAddGoal}
              className="text-primary text-sm font-medium hover:underline"
            >
              Add goal
            </button>
          )
        )}
      </div>
      {activeGoals.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
          No goals yet. Set a target to stay motivated.
        </p>
      ) : (
      <div className="space-y-3">
        {activeGoals.map((goal) => {
          const progress = Math.min(
            100,
            Math.round((goal.currentValue / goal.targetValue) * 100)
          );
          return (
            <div key={goal.goalId} className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {goal.title}
                </p>
                <span className="text-xs font-medium text-primary">
                  {progress}%
                </span>
              </div>
              <ProgressBar value={goal.currentValue} max={goal.targetValue} showLabel={false} />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {goal.currentValue.toLocaleString()} /{' '}
                {goal.targetValue.toLocaleString()} {goal.unit ?? ''}
              </p>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
