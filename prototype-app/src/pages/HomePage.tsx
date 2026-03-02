import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkout } from '../context/WorkoutContext';
import { useGoals } from '../context/GoalsContext';
import { mockGlobalMetrics, mockExerciseMetrics, mockFeedItems, getWorkoutsForDate } from '../data/mockData';
import { type WorkoutInstance, GoalType, GoalStatus } from '../types/index';
import {
  Flame,
  Trophy,
  Dumbbell,
  TrendingUp,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Plus,
  Clock,
  Target,
  Zap,
  User,
  X,
  Award,
} from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { recentWorkouts } = useWorkout();
  const { activeGoals } = useGoals();
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const workoutsLast30Days = recentWorkouts.filter(
    (w) => new Date(w.startedAt) >= thirtyDaysAgo
  );
  const volumeLast30Days = workoutsLast30Days.reduce(
    (sum, w) => sum + (w.totalVolume || 0),
    0
  );
  const timeLast30Days = workoutsLast30Days.reduce(
    (sum, w) => sum + (w.durationMinutes || 0),
    0
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const hasWorkoutOnDate = (date: Date) => {
    return getWorkoutsForDate(date, recentWorkouts).length > 0;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const selectedDateWorkouts = selectedDate ? getWorkoutsForDate(selectedDate, recentWorkouts) : [];

  const renderCalendarModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Calendar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowCalendar(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Workout History</h2>
            <div className="w-9" />
          </div>

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() =>
                setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))
              }
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <span className="font-semibold text-gray-900 dark:text-white">
              {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() =>
                setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))
              }
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(calendarMonth).map((date, i) => (
              <button
                key={i}
                onClick={() => date && setSelectedDate(date)}
                disabled={!date}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-colors ${
                  !date
                    ? 'invisible'
                    : selectedDate && date.toDateString() === selectedDate.toDateString()
                    ? 'bg-violet-600 text-white'
                    : isToday(date)
                    ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
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
                            : 'bg-violet-500'
                        }`}
                      />
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Date Workouts */}
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
                  <div
                    key={workout.workoutInstanceId}
                    className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {workout.exercises.map((e) => e.exerciseName.split(' ')[0]).slice(0, 3).join(', ')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {workout.exercises.length} exercises · {workout.durationMinutes} min ·{' '}
                      {formatVolume(workout.totalVolume || 0)} lbs
                    </p>
                  </div>
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {showCalendar && renderCalendarModal()}

      {/* Header */}
      <div className="bg-gradient-to-b from-violet-600 to-violet-700 px-4 pt-12 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-violet-200 text-sm">Welcome back</p>
            <h1 className="text-2xl font-bold text-white">{user?.displayName}</h1>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
          >
            <User className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Streak Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4">
          <div className="w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center">
            <Flame className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-violet-200 text-sm">Current Streak</p>
            <p className="text-3xl font-bold text-white">{mockGlobalMetrics.currentStreak} days</p>
          </div>
          <div className="text-right">
            <p className="text-violet-200 text-xs">Best</p>
            <p className="text-white font-semibold">{mockGlobalMetrics.longestStreak} days</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center mb-2">
              <Dumbbell className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockGlobalMetrics.totalWorkouts}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Workouts</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-2">
              <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockGlobalMetrics.workoutsLast30}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">This Month</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mb-2">
              <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatVolume(volumeLast30Days)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{timeLast30Days} min · 30d</p>
          </div>
        </div>

        {/* Personal Records */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Personal Records</h2>
          </div>
          <div className="space-y-3">
            {mockExerciseMetrics.map((metric) => (
              <div key={metric.exerciseId} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{metric.exerciseName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{metric.totalSessions} sessions</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">{metric.maxWeight} lbs</p>
                  <p className={`text-xs flex items-center justify-end gap-1 ${metric.recentProgress >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    <TrendingUp className="w-3 h-3" />
                    {metric.recentProgress > 0 ? '+' : ''}{metric.recentProgress}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Goals Progress */}
        {activeGoals.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-violet-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Goals</h2>
              </div>
              <button
                onClick={() => navigate('/goals')}
                className="text-violet-600 dark:text-violet-400 text-sm font-medium flex items-center gap-1"
              >
                See All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {activeGoals.slice(0, 3).map((goal) => {
                const progress = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
                return (
                  <div key={goal.goalId} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{goal.title}</p>
                      <span className="text-xs font-medium text-violet-600 dark:text-violet-400">{progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.unit}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weekly Activity - Clickable */}
        <button
          onClick={() => setShowCalendar(true)}
          className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mb-6 text-left hover:ring-2 hover:ring-violet-500 transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-500" />
              <h2 className="font-semibold text-gray-900 dark:text-white">This Week</h2>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex gap-2">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
              const hasWorkout = [0, 2, 4].includes(i);
              const isTodayDay = i === new Date().getDay() - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full aspect-square rounded-lg flex items-center justify-center ${
                      hasWorkout
                        ? 'bg-violet-500 text-white'
                        : isTodayDay
                        ? 'bg-violet-100 dark:bg-violet-900/30'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    {hasWorkout && <Dumbbell className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs ${isTodayDay ? 'font-bold text-violet-600 dark:text-violet-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
        </button>

        {/* Recent Workouts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Recent Workouts</h2>
            </div>
            <button className="text-violet-600 dark:text-violet-400 text-sm font-medium flex items-center gap-1">
              See All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {recentWorkouts.slice(0, 3).map((workout) => (
              <div
                key={workout.workoutInstanceId}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {workout.exercises.map((e) => e.exerciseName.split(' ')[0]).slice(0, 3).join(', ')}
                    {workout.exercises.length > 3 && ` +${workout.exercises.length - 3}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {workout.exercises.length} exercises · {workout.durationMinutes} min
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(workout.startedAt)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatVolume(workout.totalVolume || 0)} lbs</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-violet-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Activity Feed</h2>
          </div>
          <div className="space-y-4">
            {mockFeedItems.map((item) => (
              <div key={item.eventId} className="flex gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {item.actorDisplayName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {item.actorDisplayName}
                        </span>{' '}
                        <span className="text-gray-600 dark:text-gray-400">
                          {item.eventType === 'pr_hit' ? 'hit a new PR' : 'completed a workout'}
                        </span>
                      </p>
                      <p className="text-sm text-gray-900 dark:text-white mt-0.5">{item.summary}</p>
                      {item.workoutSummary && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                          {item.eventType === 'pr_hit' ? (
                            <Award className="w-3 h-3 text-amber-500" />
                          ) : (
                            <Dumbbell className="w-3 h-3" />
                          )}
                          {item.workoutSummary}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/workout/new')}
        className="fixed bottom-6 right-6 w-16 h-16 bg-violet-600 hover:bg-violet-700 rounded-full shadow-lg shadow-violet-500/40 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      >
        <Plus className="w-8 h-8 text-white" />
      </button>
    </div>
  );
}
