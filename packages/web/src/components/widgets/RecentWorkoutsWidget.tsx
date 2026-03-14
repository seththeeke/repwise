import { Clock, ChevronRight, Dumbbell } from 'lucide-react';
import type { WorkoutInstance } from '@/types';

interface RecentWorkoutsWidgetProps {
  workouts: WorkoutInstance[];
  onSeeAll: () => void;
  onWorkoutPress: (workoutId: string) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toString();
}

export function RecentWorkoutsWidget({
  workouts,
  onSeeAll,
  onWorkoutPress,
}: RecentWorkoutsWidgetProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Recent Workouts
          </h2>
        </div>
        <button
          type="button"
          onClick={onSeeAll}
          className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"
        >
          See All <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-3">
        {workouts.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            No workouts yet
          </p>
        ) : (
          workouts.map((workout) => (
            <button
              key={workout.workoutInstanceId}
              type="button"
              onClick={() => onWorkoutPress(workout.workoutInstanceId)}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Dumbbell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {workout.exercises
                    .map((e) => e.exerciseName.split(' ')[0])
                    .slice(0, 3)
                    .join(', ')}
                  {workout.exercises.length > 3 &&
                    ` +${workout.exercises.length - 3}`}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {workout.exercises.length} exercises ·{' '}
                  {workout.durationMinutes ?? 0} min
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(workout.startedAt)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatVolume(workout.totalVolume ?? 0)} lbs
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
