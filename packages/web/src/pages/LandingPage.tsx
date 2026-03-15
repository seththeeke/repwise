import { Dumbbell, Wand2, Sparkles, ChevronDown } from 'lucide-react';
import { StreakWidget } from '@/components/widgets/StreakWidget';
import { StatsRow } from '@/components/widgets/StatsRow';
import { GoalsWidget } from '@/components/widgets/GoalsWidget';
import { WeekCalendarWidget } from '@/components/widgets/WeekCalendarWidget';
import { RecentWorkoutsWidget } from '@/components/widgets/RecentWorkoutsWidget';
import { PersonalRecordsWidget } from '@/components/widgets/PersonalRecordsWidget';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  GoalType,
  GoalTimeframe,
  GoalStatus,
  WorkoutStatus,
  WorkoutSource,
  PermissionType,
  ExerciseModality,
} from '@/types';
import type { Goal, WorkoutInstance } from '@/types';
import type { WeightUnit } from '@/types';

interface LandingPageProps {
  onOpenLogin: () => void;
}

// Dummy data for product preview
const DUMMY_DISPLAY_NAME = 'Alex';
const DUMMY_STREAK = { current: 5, longest: 12 };
const DUMMY_STATS = {
  totalWorkouts: 48,
  workoutsThisMonth: 8,
  totalVolumeLast30Days: 42500,
  durationLast30Days: 320,
};
const DUMMY_COMPLETED_DATES = ['2025-03-10', '2025-03-12', '2025-03-14', '2025-03-15'];
const DUMMY_GOALS: Goal[] = [
  {
    goalId: 'g1',
    userId: 'u1',
    PK: 'USER#u1',
    SK: 'GOAL#g1',
    type: GoalType.TOTAL_WORKOUTS,
    status: GoalStatus.ACTIVE,
    title: '12 workouts this month',
    timeframe: GoalTimeframe.MONTHLY,
    targetValue: 12,
    currentValue: 8,
    unit: 'workouts',
    startDate: '2025-03-01',
    endDate: '2025-03-31',
    createdAt: '2025-03-01T00:00:00Z',
  },
  {
    goalId: 'g2',
    userId: 'u1',
    PK: 'USER#u1',
    SK: 'GOAL#g2',
    type: GoalType.TOTAL_VOLUME,
    status: GoalStatus.ACTIVE,
    title: '50K lbs volume (30 days)',
    timeframe: GoalTimeframe.MONTHLY,
    targetValue: 50000,
    currentValue: 42500,
    unit: 'lbs',
    startDate: '2025-03-01',
    endDate: '2025-03-31',
    createdAt: '2025-03-01T00:00:00Z',
  },
];
const DUMMY_WORKOUTS: WorkoutInstance[] = [
  {
    workoutInstanceId: 'w1',
    userId: 'u1',
    PK: 'USER#u1',
    SK: 'WORKOUT#w1',
    status: WorkoutStatus.COMPLETED,
    source: WorkoutSource.AI_GENERATED,
    permissionType: PermissionType.FOLLOWERS_ONLY,
    startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    durationMinutes: 42,
    totalVolume: 8250,
    exercises: [
      { exerciseId: 'e1', exerciseName: 'Bench Press', modality: ExerciseModality.SETS_REPS, sets: 4, reps: 8, skipped: false, orderIndex: 0 },
      { exerciseId: 'e2', exerciseName: 'Incline Dumbbell Press', modality: ExerciseModality.SETS_REPS, sets: 3, reps: 10, skipped: false, orderIndex: 1 },
      { exerciseId: 'e3', exerciseName: 'Cable Fly', modality: ExerciseModality.SETS_REPS, sets: 3, reps: 12, skipped: false, orderIndex: 2 },
    ],
  },
  {
    workoutInstanceId: 'w2',
    userId: 'u1',
    PK: 'USER#u1',
    SK: 'WORKOUT#w2',
    status: WorkoutStatus.COMPLETED,
    source: WorkoutSource.MANUAL,
    permissionType: PermissionType.FOLLOWERS_ONLY,
    startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    durationMinutes: 38,
    totalVolume: 6200,
    exercises: [
      { exerciseId: 'e4', exerciseName: 'Barbell Row', modality: ExerciseModality.SETS_REPS, sets: 4, reps: 8, skipped: false, orderIndex: 0 },
      { exerciseId: 'e5', exerciseName: 'Pull-Ups', modality: ExerciseModality.SETS_REPS, sets: 3, reps: 8, skipped: false, orderIndex: 1 },
    ],
  },
];
const DUMMY_PR_RECORDS: { exerciseName: string; maxWeight: number; maxWeightUnit: WeightUnit; totalSessions: number }[] = [
  { exerciseName: 'Bench Press', maxWeight: 185, maxWeightUnit: 'LBS', totalSessions: 24 },
  { exerciseName: 'Squat', maxWeight: 225, maxWeightUnit: 'LBS', totalSessions: 18 },
  { exerciseName: 'Deadlift', maxWeight: 275, maxWeightUnit: 'LBS', totalSessions: 12 },
];

export default function LandingPage({ onOpenLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 px-4 py-4 flex items-center justify-between max-w-6xl mx-auto w-full bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">Repwise</span>
        </div>
        <button
          type="button"
          onClick={onOpenLogin}
          className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-lg shadow-primary/30 transition-all"
        >
          Log in
        </button>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Hero */}
        <section className="px-4 pt-16 pb-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            Track your fitness journey
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
            Log workouts, set goals, and see your progress over time—with AI-generated plans and a clean execution experience.
          </p>
          <button
            type="button"
            onClick={onOpenLogin}
            className="px-8 py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-lg shadow-primary/30 transition-all text-lg"
          >
            Get started — Log in
          </button>
        </section>

        {/* Dashboard preview */}
        <section className="px-4 pb-24">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Your dashboard
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Streaks, stats, goals, and recent workouts in one place
            </p>
          </div>
          <div className="max-w-md mx-auto rounded-3xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="bg-gradient-to-b from-primary to-primary-dark px-4 pt-8 pb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-violet-200 text-sm">Welcome back</p>
                  <h1 className="text-2xl font-bold text-white">{DUMMY_DISPLAY_NAME}</h1>
                </div>
                <Avatar displayName={DUMMY_DISPLAY_NAME} size="md" className="ring-2 ring-white/20" />
              </div>
              <StreakWidget currentStreak={DUMMY_STREAK.current} longestStreak={DUMMY_STREAK.longest} />
            </div>
            <div className="px-4 py-6 -mt-4 space-y-5 bg-gray-50 dark:bg-gray-900">
              <StatsRow
                totalWorkouts={DUMMY_STATS.totalWorkouts}
                workoutsThisMonth={DUMMY_STATS.workoutsThisMonth}
                totalVolumeLast30Days={DUMMY_STATS.totalVolumeLast30Days}
                durationLast30Days={DUMMY_STATS.durationLast30Days}
              />
              <PersonalRecordsWidget records={DUMMY_PR_RECORDS} />
              <GoalsWidget goals={DUMMY_GOALS} onSeeAll={() => {}} onAddGoal={() => {}} />
              <div className="pointer-events-none">
                <WeekCalendarWidget completedDates={DUMMY_COMPLETED_DATES} />
              </div>
              <RecentWorkoutsWidget
                workouts={DUMMY_WORKOUTS}
                onSeeAll={() => {}}
                onWorkoutPress={() => {}}
              />
            </div>
          </div>
        </section>

        {/* Goals progress highlight */}
        <section className="px-4 pb-24">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Goals that keep you on track
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Set monthly targets for workouts and volume—see progress at a glance
            </p>
          </div>
          <div className="max-w-sm mx-auto bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="space-y-4">
              {DUMMY_GOALS.slice(0, 2).map((goal) => {
                const progress = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
                return (
                  <div key={goal.goalId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{goal.title}</p>
                      <span className="text-xs font-medium text-primary">{progress}%</span>
                    </div>
                    <ProgressBar value={goal.currentValue} max={goal.targetValue} showLabel={false} />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.unit ?? ''}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* AI workout preview */}
        <section className="px-4 pb-24">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              AI-powered workouts in one click
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Describe what you want—upper body, 45 minutes, home equipment—and get a tailored plan
            </p>
          </div>
          <div className="max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">What would you like to train?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Describe your goals or time available</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 p-4 min-h-[100px] text-gray-500 dark:text-gray-400 text-sm">
              e.g., 45 minute upper body push workout focusing on chest and shoulders...
            </div>
            <button
              type="button"
              className="w-full mt-4 py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg"
            >
              <Wand2 className="w-5 h-5" />
              Generate Workout
            </button>
          </div>
        </section>

        {/* Execution view preview */}
        <section className="px-4 pb-24">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Track every rep
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Clean execution view with timer, weight entry, and quick-add buttons
            </p>
          </div>
          <div className="max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 bg-gray-900">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="w-12 h-12 rounded-full bg-gray-800" />
              <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full">
                <span className="font-mono text-lg text-primary">12:34</span>
                <div className="w-4 h-4 rounded bg-gray-600" />
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-800" />
            </div>
            <div className="p-6">
              <p className="text-center text-gray-400 text-sm mb-2">Bench Press · Set 2</p>
              <div className="bg-gray-800 rounded-2xl p-6">
                <label className="block text-sm text-gray-400 mb-2 text-center">Weight (lbs)</label>
                <div className="text-center text-5xl font-bold text-white">135</div>
              </div>
              <div className="flex gap-2 mt-4">
                {[5, 10, 25, 45].map((w) => (
                  <button
                    key={w}
                    type="button"
                    className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium text-white"
                  >
                    +{w}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 pt-12 pb-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to build the habit?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Join Repwise and get your dashboard, goals, and AI workouts in one app.
          </p>
          <button
            type="button"
            onClick={onOpenLogin}
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-lg shadow-primary/30 transition-all"
          >
            Get started
            <ChevronDown className="w-5 h-5 rotate-[-90deg]" />
          </button>
        </section>

        <footer className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800">
          Repwise
        </footer>
      </main>
    </div>
  );
}
