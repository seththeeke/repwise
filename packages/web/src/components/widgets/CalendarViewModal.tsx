import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react';
import type { WorkoutInstance } from '@/types';

interface CalendarViewModalProps {
  completedDates: string[];
  recentWorkouts: WorkoutInstance[];
  onClose: () => void;
  onWorkoutPress?: (id: string) => void;
}

function getDaysInMonth(date: Date): (Date | null)[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startingDayOfWeek = firstDay.getDay();
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const days: (Date | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
  return days;
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getWorkoutsForDate(date: Date, workouts: WorkoutInstance[]): WorkoutInstance[] {
  const dateStr = toISODate(date);
  return workouts.filter((w) => {
    const completed = w.completedAt?.split('T')[0] ?? w.startedAt?.split('T')[0];
    return completed === dateStr;
  });
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toString();
}

export function CalendarViewModal({
  completedDates,
  recentWorkouts,
  onClose,
  onWorkoutPress,
}: CalendarViewModalProps) {
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const hasWorkoutOnDate = (date: Date) => completedDates.includes(toISODate(date));
  const isToday = (date: Date) => toISODate(date) === toISODate(new Date());
  const selectedDateWorkouts = selectedDate
    ? getWorkoutsForDate(selectedDate, recentWorkouts)
    : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Workout History
            </h2>
            <div className="w-9" />
          </div>
          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={() =>
                setCalendarMonth(
                  new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1)
                )
              }
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <span className="font-semibold text-gray-900 dark:text-white">
              {calendarMonth.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <button
              type="button"
              onClick={() =>
                setCalendarMonth(
                  new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1)
                )
              }
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
        <div className="p-4 overflow-auto">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div
                key={i}
                className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(calendarMonth).map((date, i) => (
              <button
                key={i}
                type="button"
                onClick={() => date && setSelectedDate(date)}
                disabled={!date}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-colors ${
                  !date
                    ? 'invisible'
                    : selectedDate && date.toDateString() === selectedDate.toDateString()
                      ? 'bg-primary text-white'
                      : isToday(date)
                        ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                {date && (
                  <>
                    <span>{date.getDate()}</span>
                    {hasWorkoutOnDate(date) && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                          selectedDate && date.toDateString() === selectedDate.toDateString()
                            ? 'bg-white'
                            : 'bg-primary'
                        }`}
                      />
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
        {selectedDate && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 max-h-60 overflow-auto">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </h3>
            {selectedDateWorkouts.length > 0 ? (
              <div className="space-y-2">
                {selectedDateWorkouts.map((workout) => (
                  <button
                    key={workout.workoutInstanceId}
                    type="button"
                    onClick={() =>
                      onWorkoutPress?.(workout.workoutInstanceId)
                    }
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {workout.exercises
                          .map((e) => e.exerciseName.split(' ')[0])
                          .slice(0, 3)
                          .join(', ')}
                        {workout.exercises.length > 3 &&
                          ` +${workout.exercises.length - 3}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {workout.exercises.length} exercises ·{' '}
                        {workout.durationMinutes ?? 0} min ·{' '}
                        {formatVolume(workout.totalVolume ?? 0)} lbs
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No workouts on this day
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
