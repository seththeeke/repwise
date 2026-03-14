import { Dumbbell, Target, Zap } from 'lucide-react';

interface StatsRowProps {
  totalWorkouts: number;
  workoutsThisMonth: number;
  totalVolumeLast30Days: number;
  durationLast30Days: number;
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toString();
}

export function StatsRow({
  totalWorkouts,
  workoutsThisMonth,
  totalVolumeLast30Days,
  durationLast30Days,
}: StatsRowProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="w-8 h-8 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center mb-2">
          <Dumbbell className="w-4 h-4 text-primary" />
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {totalWorkouts}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Workouts</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="w-8 h-8 bg-accent-green/10 dark:bg-accent-green/20 rounded-lg flex items-center justify-center mb-2">
          <Target className="w-4 h-4 text-accent-green" />
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {workoutsThisMonth}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">This Month</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="w-8 h-8 bg-accent-orange/10 dark:bg-accent-orange/20 rounded-lg flex items-center justify-center mb-2">
          <Zap className="w-4 h-4 text-accent-orange" />
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {formatVolume(totalVolumeLast30Days)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {durationLast30Days} min · 30d
        </p>
      </div>
    </div>
  );
}
