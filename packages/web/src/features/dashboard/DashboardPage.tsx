import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useDashboardData } from './hooks/useDashboardData';
import { CalendarViewModal } from '@/components/widgets/CalendarViewModal';
import { DashboardHeader } from './DashboardHeader';
import { StreakWidget } from '@/components/widgets/StreakWidget';
import { StatsRow } from '@/components/widgets/StatsRow';
import { PersonalRecordsWidget } from '@/components/widgets/PersonalRecordsWidget';
import { WeekCalendarWidget } from '@/components/widgets/WeekCalendarWidget';
import { GoalsWidget } from '@/components/widgets/GoalsWidget';
import { RecentWorkoutsWidget } from '@/components/widgets/RecentWorkoutsWidget';
import { ActivityFeedWidget } from '@/components/widgets/ActivityFeedWidget';
import { Spinner } from '@/components/ui/Spinner';
import { ToastContainer } from '@/components/ui/Toast';

interface DashboardPageProps {
  displayName: string;
  profilePhoto?: string | null;
}

export function DashboardPage({
  displayName,
  profilePhoto,
}: DashboardPageProps) {
  const navigate = useNavigate();
  const [showCalendar, setShowCalendar] = useState(false);
  const { data, isLoading, error } = useDashboardData();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <p className="text-red-600 dark:text-red-400 text-center">
          Failed to load dashboard. Please try again.
        </p>
      </div>
    );
  }

  const global = data?.globalMetrics;
  const recentWorkouts = data?.recentWorkouts ?? [];
  const activeGoals = data?.activeGoals ?? [];
  const feedItems = data?.feedItems ?? [];
  const exerciseMetrics = data?.exerciseMetrics ?? [];

  const workoutsThisMonth = global?.workoutsLast30 ?? 0;
  const volumeLast30 = recentWorkouts.reduce(
    (sum, w) => sum + (w.totalVolume ?? 0),
    0
  );
  const durationLast30 = recentWorkouts.reduce(
    (sum, w) => sum + (w.durationMinutes ?? 0),
    0
  );

  const prRecords = (Array.isArray(exerciseMetrics) ? exerciseMetrics : [])
    .slice()
    .sort((a, b) => b.maxWeight - a.maxWeight)
    .slice(0, 5)
    .map((em) => ({
      exerciseName: em.exerciseName,
      maxWeight: em.maxWeight,
      maxWeightUnit: em.maxWeightUnit,
      totalSessions: em.totalSessions,
    }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {showCalendar && (
        <CalendarViewModal
          completedDates={global?.completedDates ?? []}
          recentWorkouts={recentWorkouts}
          onClose={() => setShowCalendar(false)}
          onWorkoutPress={(id) => {
            setShowCalendar(false);
            navigate(`/workouts/${id}`);
          }}
        />
      )}
      <ToastContainer />

      <div className="bg-gradient-to-b from-primary to-primary-dark px-4 pt-12 pb-8">
        <DashboardHeader displayName={displayName} profilePhoto={profilePhoto} />
        {global ? (
          <StreakWidget
            currentStreak={global.currentStreak}
            longestStreak={global.longestStreak}
          />
        ) : null}
      </div>

      <div className="px-4 -mt-4 space-y-6">
        {global ? (
          <StatsRow
            totalWorkouts={global.totalWorkouts}
            workoutsThisMonth={workoutsThisMonth}
            totalVolumeLast30Days={volumeLast30}
            durationLast30Days={durationLast30}
          />
        ) : null}

        {prRecords.length > 0 ? (
          <PersonalRecordsWidget records={prRecords} />
        ) : null}

        <GoalsWidget
          goals={activeGoals}
          onSeeAll={() => navigate('/goals')}
          onAddGoal={() => navigate('/goals?add=1')}
        />

        <WeekCalendarWidget
          completedDates={global?.completedDates ?? []}
          onWeekPress={() => setShowCalendar(true)}
        />

        <RecentWorkoutsWidget
          workouts={recentWorkouts.slice(0, 5)}
          onSeeAll={() => navigate('/workouts')}
          onWorkoutPress={(id) => navigate(`/workouts/${id}`)}
        />

        <ActivityFeedWidget feedItems={feedItems} />
      </div>

      {/* Floating Action Button - New Workout */}
      <button
        type="button"
        onClick={() => navigate('/workout/new')}
        className="fixed bottom-6 right-6 w-16 h-16 bg-primary hover:bg-primary-dark rounded-full shadow-lg shadow-primary/40 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      >
        <Plus className="w-8 h-8 text-white" />
      </button>
    </div>
  );
}
