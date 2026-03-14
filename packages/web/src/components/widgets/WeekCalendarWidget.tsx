import { Dumbbell } from 'lucide-react';

interface WeekCalendarWidgetProps {
  completedDates: string[];
  onWeekPress?: () => void;
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getCurrentWeekDates(): Date[] {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function WeekCalendarWidget({
  completedDates,
  onWeekPress,
}: WeekCalendarWidgetProps) {
  const weekDates = getCurrentWeekDates();
  const today = toISODate(new Date());

  const content = (
    <div className="flex gap-2">
      {weekDates.map((date, i) => {
        const dateStr = toISODate(date);
        const hasWorkout = completedDates.includes(dateStr);
        const isToday = dateStr === today;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-full aspect-square rounded-lg flex items-center justify-center ${
                hasWorkout
                  ? 'bg-primary text-white'
                  : isToday
                    ? 'bg-primary/10 dark:bg-primary/20'
                    : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              {hasWorkout ? <Dumbbell className="w-4 h-4" /> : null}
            </div>
            <span
              className={`text-xs ${
                isToday
                  ? 'font-bold text-primary'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {WEEKDAY_LABELS[i]}
            </span>
          </div>
        );
      })}
    </div>
  );

  if (onWeekPress) {
    return (
      <button
        type="button"
        onClick={onWeekPress}
        className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm text-left hover:ring-2 hover:ring-primary transition-all"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            This Week
          </h2>
          <span className="text-gray-400 dark:text-gray-500">›</span>
        </div>
        {content}
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
        This Week
      </h2>
      {content}
    </div>
  );
}
