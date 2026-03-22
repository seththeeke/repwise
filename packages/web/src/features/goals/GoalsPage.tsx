import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { goalsApi } from '@/api/goals';
import { GoalStatus, GoalType, GoalTimeframe, type Goal } from '@/types';
import { ChevronLeft, Plus, X, Target } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  [GoalType.TOTAL_WORKOUTS]: 'Total workouts',
  [GoalType.WORKOUTS_PER_WEEK]: 'Workouts per week',
  [GoalType.TOTAL_VOLUME]: 'Total volume',
  [GoalType.ONE_REP_MAX]: 'One rep max',
  [GoalType.WORKOUT_STREAK]: 'Workout streak',
  [GoalType.EXERCISE_SESSIONS]: 'Exercise sessions',
};

const TIMEFRAME_OPTIONS: { value: GoalTimeframe; label: string }[] = [
  { value: GoalTimeframe.WEEKLY, label: 'Weekly' },
  { value: GoalTimeframe.MONTHLY, label: 'Monthly' },
  { value: GoalTimeframe.QUARTERLY, label: 'Quarterly' },
  { value: GoalTimeframe.YEARLY, label: 'Yearly' },
  { value: GoalTimeframe.ALL_TIME, label: 'All time' },
];

export function GoalsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addType, setAddType] = useState<GoalType>(GoalType.TOTAL_WORKOUTS);
  const [addTimeframe, setAddTimeframe] = useState<GoalTimeframe>(GoalTimeframe.MONTHLY);
  const [addTarget, setAddTarget] = useState('');
  const [addUnit, setAddUnit] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('add') === '1') setAddOpen(true);
  }, [searchParams]);

  const { data: goalsRes, isLoading } = useQuery({
    queryKey: ['goals', GoalStatus.ACTIVE],
    queryFn: () => goalsApi.list(GoalStatus.ACTIVE),
  });

  const list: Goal[] = Array.isArray(goalsRes)
    ? goalsRes
    : Array.isArray((goalsRes as { items?: Goal[] })?.items)
      ? (goalsRes as { items: Goal[] }).items
      : [];

  const handleAddGoal = async () => {
    const targetValue = parseInt(addTarget, 10);
    if (!addTitle.trim() || Number.isNaN(targetValue) || targetValue < 1) {
      setAddError('Title and a positive target are required.');
      return;
    }
    if (addTitle.trim().length > 100) {
      setAddError('Title must be 100 characters or less.');
      return;
    }
    setAddError(null);
    setAddSubmitting(true);
    try {
      await goalsApi.create({
        type: addType,
        title: addTitle.trim(),
        timeframe: addTimeframe,
        targetValue,
        unit: addUnit.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setAddOpen(false);
      setAddTitle('');
      setAddTarget('');
      setAddUnit('');
    } catch {
      setAddError('Something went wrong. Please try again.');
    } finally {
      setAddSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-b from-primary to-primary-dark px-4 pt-12 pb-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Goals</h1>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Add goal"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
            <EmptyState
              icon={<Target className="w-7 h-7" />}
              heading="No goals yet"
              subtext="Create one to get started."
              action={
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark"
                >
                  Add goal
                </button>
              }
            />
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((goal) => (
              <div
                key={goal.goalId}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
              >
                <p className="font-medium text-gray-900 dark:text-white">
                  {goal.title}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {goal.currentValue} / {goal.targetValue} {goal.unit ?? ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {addOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                New goal
              </h2>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {addError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{addError}</p>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  placeholder="e.g. Hit 12 workouts this month"
                  maxLength={100}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {addTitle.length > 0 && (
                  <p className={`mt-1 text-xs ${addTitle.length >= 100 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {addTitle.length} / 100
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={addType}
                  onChange={(e) => setAddType(e.target.value as GoalType)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {(Object.keys(GOAL_TYPE_LABELS) as GoalType[]).map((t) => (
                    <option key={t} value={t}>
                      {GOAL_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Timeframe
                </label>
                <select
                  value={addTimeframe}
                  onChange={(e) => setAddTimeframe(e.target.value as GoalTimeframe)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {TIMEFRAME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target
                </label>
                <input
                  type="number"
                  min={1}
                  value={addTarget}
                  onChange={(e) => setAddTarget(e.target.value)}
                  placeholder="e.g. 12"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Unit (optional)
                </label>
                <input
                  type="text"
                  value={addUnit}
                  onChange={(e) => setAddUnit(e.target.value)}
                  placeholder="e.g. workouts, lbs"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddGoal}
              disabled={addSubmitting}
              className="w-full mt-4 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark disabled:opacity-50"
            >
              {addSubmitting ? 'Creating...' : 'Create goal'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
