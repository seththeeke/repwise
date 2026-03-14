import { Flame } from 'lucide-react';

interface StreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
}

export function StreakWidget({
  currentStreak,
  longestStreak,
}: StreakWidgetProps) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4">
      <div className="w-14 h-14 bg-accent-orange rounded-xl flex items-center justify-center flex-shrink-0">
        <Flame className="w-7 h-7 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-violet-200 text-sm">Current Streak</p>
        <p className="text-3xl font-bold text-white">{currentStreak} days</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-violet-200 text-xs">Best</p>
        <p className="text-white font-semibold">{longestStreak} days</p>
      </div>
    </div>
  );
}
