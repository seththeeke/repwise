import { Flame } from 'lucide-react';

interface StreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
  /** Use "light" on light backgrounds (e.g. profile) so text is readable */
  variant?: 'default' | 'light';
}

export function StreakWidget({
  currentStreak,
  longestStreak,
  variant = 'default',
}: StreakWidgetProps) {
  const isLight = variant === 'light';
  return (
    <div
      className={
        isLight
          ? 'bg-white dark:bg-gray-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-100 dark:border-gray-700'
          : 'bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4'
      }
    >
      <div
        className={
          isLight
            ? 'w-14 h-14 bg-accent-orange/20 rounded-xl flex items-center justify-center flex-shrink-0'
            : 'w-14 h-14 bg-accent-orange rounded-xl flex items-center justify-center flex-shrink-0'
        }
      >
        <Flame className={`w-7 h-7 ${isLight ? 'text-accent-orange' : 'text-white'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={
            isLight
              ? 'text-gray-500 dark:text-gray-400 text-sm'
              : 'text-violet-200 text-sm'
          }
        >
          Current Streak
        </p>
        <p
          className={
            isLight
              ? 'text-3xl font-bold text-gray-900 dark:text-white'
              : 'text-3xl font-bold text-white'
          }
        >
          {currentStreak} days
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p
          className={
            isLight
              ? 'text-gray-500 dark:text-gray-400 text-xs'
              : 'text-violet-200 text-xs'
          }
        >
          Best
        </p>
        <p
          className={
            isLight
              ? 'text-gray-900 dark:text-white font-semibold'
              : 'text-white font-semibold'
          }
        >
          {longestStreak} days
        </p>
      </div>
    </div>
  );
}
