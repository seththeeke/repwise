import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Skeleton } from '@/components/ui/Skeleton';

const FAB_GUIDED_KEY = 'workout_fab_guided';
const PULL_REFRESH_THRESHOLD = 72;
const MAX_PULL_DISTANCE = 120;

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className="bg-gradient-to-b from-primary to-primary-dark px-4 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
      <div className="px-4 -mt-4 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    </div>
  );
}
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
import { AdminFloatingButton } from '../admin/AdminFloatingButton';
import { useDevToolsStore } from '@/stores/devToolsStore';

interface DashboardPageProps {
  displayName: string;
  profilePhoto?: string | null;
}

export function DashboardPage({
  displayName,
  profilePhoto,
}: DashboardPageProps) {
  const navigate = useNavigate();
  const isIosNative = Capacitor.getPlatform() === 'ios';
  const [showCalendar, setShowCalendar] = useState(false);
  const [showFabCoachMark, setShowFabCoachMark] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const simulateLoading = useDevToolsStore((s) => s.simulateLoading);
  const { data, isLoading, error } = useDashboardData();
  const showSkeleton = isLoading || simulateLoading;
  const pullStartYRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const reloadingRef = useRef(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(FAB_GUIDED_KEY) !== '1') {
        setShowFabCoachMark(true);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    reloadingRef.current = isReloading;
  }, [isReloading]);

  useEffect(() => {
    if (!isIosNative) return;

    const updatePullDistance = (value: number) => {
      pullDistanceRef.current = value;
      setPullDistance(value);
    };

    const resetPull = () => {
      pullStartYRef.current = null;
      setIsPulling(false);
      updatePullDistance(0);
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (window.scrollY > 0 || reloadingRef.current) {
        pullStartYRef.current = null;
        return;
      }
      const touch = event.touches[0];
      if (!touch) return;
      pullStartYRef.current = touch.clientY;
      setIsPulling(false);
      updatePullDistance(0);
    };

    const handleTouchMove = (event: TouchEvent) => {
      const startY = pullStartYRef.current;
      if (startY === null || reloadingRef.current) return;

      if (window.scrollY > 0) {
        resetPull();
        return;
      }

      const touch = event.touches[0];
      if (!touch) return;

      const delta = touch.clientY - startY;
      if (delta <= 0) {
        setIsPulling(false);
        updatePullDistance(0);
        return;
      }

      // Dampening keeps the indicator movement natural and bounded.
      const dampenedDistance = Math.min(MAX_PULL_DISTANCE, delta * 0.5);
      setIsPulling(true);
      updatePullDistance(dampenedDistance);
    };

    const handleTouchEnd = () => {
      const shouldReload =
        pullDistanceRef.current >= PULL_REFRESH_THRESHOLD && !reloadingRef.current;
      resetPull();
      if (!shouldReload) return;
      setIsReloading(true);
      window.location.reload();
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isIosNative]);

  const dismissFabCoachMark = () => {
    try {
      localStorage.setItem(FAB_GUIDED_KEY, '1');
    } catch {
      // ignore
    }
    setShowFabCoachMark(false);
  };

  const showPullHint = isIosNative && (isPulling || isReloading);
  const shouldReleaseToRefresh = pullDistance >= PULL_REFRESH_THRESHOLD;

  if (showSkeleton) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <p className="text-red-600 dark:text-red-400 text-center mb-4">
          Something went wrong. Please try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark"
        >
          Try again
        </button>
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
      {showPullHint && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          style={{
            top: 'max(0.5rem, env(safe-area-inset-top))',
            opacity: Math.min(1, Math.max(0.25, pullDistance / PULL_REFRESH_THRESHOLD)),
          }}
        >
          <div className="rounded-full bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 px-3 py-1.5 shadow-sm">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-200">
              {isReloading
                ? 'Refreshing...'
                : shouldReleaseToRefresh
                  ? 'Release to refresh'
                  : 'Pull to refresh'}
            </p>
          </div>
        </div>
      )}

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
          onLogWorkout={() => navigate('/workout/new')}
        />

        <ActivityFeedWidget feedItems={feedItems} />
      </div>

      {/* Floating Action Button - New Workout */}
      <button
        type="button"
        onClick={() => {
          dismissFabCoachMark();
          navigate('/workout/new');
        }}
        className="fixed bottom-6 right-6 w-16 h-16 bg-primary hover:bg-primary-dark rounded-full shadow-lg shadow-primary/40 flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-20"
        aria-label="New workout"
      >
        <Plus className="w-8 h-8 text-white" />
      </button>

      {/* Floating Admin navigation */}
      <AdminFloatingButton className="left-6" />

      {/* One-time coach mark for FAB */}
      {showFabCoachMark && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-end p-4 pb-24 pr-6"
          role="dialog"
          aria-label="Tip"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={dismissFabCoachMark}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 max-w-[260px] border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-200 mb-3">
              Tap the <strong>+</strong> button to create your first workout.
            </p>
            <button
              type="button"
              onClick={dismissFabCoachMark}
              className="w-full py-2 rounded-lg bg-primary text-white text-sm font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
