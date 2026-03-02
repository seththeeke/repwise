import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoals } from '../context/GoalsContext';
import { GoalType, GoalStatus, GoalTimeframe } from '../types/index';
import { mockExercises, goalTypeInfo } from '../data/mockData';
import {
  ArrowLeft,
  Plus,
  Target,
  Trophy,
  Flame,
  Dumbbell,
  Calendar,
  Zap,
  Clock,
  Check,
  ChevronRight,
  Trash2,
  X,
  Award,
} from 'lucide-react';

const goalIcons: Record<GoalType, React.ReactNode> = {
  [GoalType.TOTAL_WORKOUTS]: <Dumbbell className="w-5 h-5" />,
  [GoalType.WORKOUTS_PER_WEEK]: <Calendar className="w-5 h-5" />,
  [GoalType.TOTAL_VOLUME]: <Zap className="w-5 h-5" />,
  [GoalType.ONE_REP_MAX]: <Trophy className="w-5 h-5" />,
  [GoalType.WORKOUT_STREAK]: <Flame className="w-5 h-5" />,
  [GoalType.EXERCISE_SESSIONS]: <Target className="w-5 h-5" />,
  [GoalType.TOTAL_TIME]: <Clock className="w-5 h-5" />,
};

const timeframeLabels: Record<GoalTimeframe, string> = {
  [GoalTimeframe.WEEKLY]: 'Weekly',
  [GoalTimeframe.MONTHLY]: 'Monthly',
  [GoalTimeframe.QUARTERLY]: 'Quarterly',
  [GoalTimeframe.YEARLY]: 'Yearly',
  [GoalTimeframe.ALL_TIME]: 'All Time',
};

export default function GoalsPage() {
  const navigate = useNavigate();
  const { activeGoals, completedGoals, createGoal, deleteGoal } = useGoals();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<'type' | 'details'>('type');
  const [selectedType, setSelectedType] = useState<GoalType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [timeframe, setTimeframe] = useState<GoalTimeframe>(GoalTimeframe.MONTHLY);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const resetForm = () => {
    setCreateStep('type');
    setSelectedType(null);
    setTitle('');
    setDescription('');
    setTargetValue('');
    setTimeframe(GoalTimeframe.MONTHLY);
    setSelectedExercise(null);
  };

  const handleSelectType = (type: GoalType) => {
    setSelectedType(type);
    setTitle(goalTypeInfo[type].label);
    setCreateStep('details');
  };

  const handleCreate = () => {
    if (!selectedType || !title || !targetValue) return;

    const exercise = selectedExercise
      ? mockExercises.find((e) => e.exerciseId === selectedExercise)
      : undefined;

    createGoal({
      type: selectedType,
      title,
      description: description || undefined,
      targetValue: parseFloat(targetValue),
      timeframe,
      exerciseId: exercise?.exerciseId,
      exerciseName: exercise?.name,
      unit: goalTypeInfo[selectedType].defaultUnit,
    });

    setShowCreateModal(false);
    resetForm();
  };

  const getProgress = (current: number, target: number) => {
    return Math.min(100, Math.round((current / target) * 100));
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'lbs' && value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  const getDaysRemaining = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const needsExerciseSelection = (type: GoalType) => {
    return type === GoalType.ONE_REP_MAX || type === GoalType.EXERCISE_SESSIONS;
  };

  const renderCreateModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              if (createStep === 'details') {
                setCreateStep('type');
              } else {
                setShowCreateModal(false);
                resetForm();
              }
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            {createStep === 'details' ? (
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            ) : (
              <X className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {createStep === 'type' ? 'Choose Goal Type' : 'Set Your Goal'}
          </h2>
          <div className="w-9" />
        </div>

        {/* Content */}
        <div className="p-4 overflow-auto max-h-[70vh]">
          {createStep === 'type' ? (
            <div className="space-y-2">
              {Object.values(GoalType).map((type) => (
                <button
                  key={type}
                  onClick={() => handleSelectType(type)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors text-left"
                >
                  <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center text-violet-600 dark:text-violet-400">
                    {goalIcons[type]}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {goalTypeInfo[type].label}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {goalTypeInfo[type].description}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Goal Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Goal Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Bench Press 225 lbs"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Why is this goal important?"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              {/* Exercise Selection (for certain goal types) */}
              {selectedType && needsExerciseSelection(selectedType) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Exercise
                  </label>
                  <select
                    value={selectedExercise || ''}
                    onChange={(e) => setSelectedExercise(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="">Select an exercise</option>
                    {mockExercises.map((ex) => (
                      <option key={ex.exerciseId} value={ex.exerciseId}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target {selectedType && goalTypeInfo[selectedType].defaultUnit}
                </label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="e.g., 225"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              {/* Timeframe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Timeframe
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.values(GoalTimeframe).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        timeframe === tf
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {timeframeLabels[tf]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreate}
                disabled={!title || !targetValue || (needsExerciseSelection(selectedType!) && !selectedExercise)}
                className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/30 disabled:shadow-none transition-all mt-4"
              >
                Create Goal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-8">
      {showCreateModal && renderCreateModal()}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 pt-12 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Goals</h1>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setShowCompleted(false)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              !showCompleted
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Active ({activeGoals.length})
          </button>
          <button
            onClick={() => setShowCompleted(true)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              showCompleted
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Completed ({completedGoals.length})
          </button>
        </div>
      </div>

      {/* Goals List */}
      <div className="p-4 space-y-4">
        {(showCompleted ? completedGoals : activeGoals).length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {showCompleted ? 'No completed goals yet' : 'No active goals'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {showCompleted
                ? 'Complete your first goal to see it here'
                : 'Create a goal to start tracking your progress'}
            </p>
            {!showCompleted && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors"
              >
                Create Goal
              </button>
            )}
          </div>
        ) : (
          (showCompleted ? completedGoals : activeGoals).map((goal) => {
            const progress = getProgress(goal.currentValue, goal.targetValue);
            const daysRemaining = getDaysRemaining(goal.endDate);

            return (
              <div
                key={goal.goalId}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      goal.status === GoalStatus.COMPLETED
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                    }`}
                  >
                    {goal.status === GoalStatus.COMPLETED ? (
                      <Award className="w-6 h-6" />
                    ) : (
                      goalIcons[goal.type]
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{goal.title}</h3>
                        {goal.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {goal.description}
                          </p>
                        )}
                      </div>
                      {goal.status === GoalStatus.ACTIVE && (
                        <button
                          onClick={() => deleteGoal(goal.goalId)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">
                          {formatValue(goal.currentValue, goal.unit)} / {formatValue(goal.targetValue, goal.unit)} {goal.unit}
                        </span>
                        <span
                          className={`font-medium ${
                            goal.status === GoalStatus.COMPLETED
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-violet-600 dark:text-violet-400'
                          }`}
                        >
                          {progress}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            goal.status === GoalStatus.COMPLETED
                              ? 'bg-green-500'
                              : 'bg-violet-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer Info */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {timeframeLabels[goal.timeframe]}
                      </span>
                      {goal.status === GoalStatus.ACTIVE && daysRemaining !== null && (
                        <span className={daysRemaining <= 7 ? 'text-amber-600 dark:text-amber-400' : ''}>
                          {daysRemaining} days left
                        </span>
                      )}
                      {goal.status === GoalStatus.COMPLETED && goal.completedAt && (
                        <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Completed {new Date(goal.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      {!showCompleted && (
        <button
          onClick={() => setShowCreateModal(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-violet-600 hover:bg-violet-700 rounded-full shadow-lg shadow-violet-500/40 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      )}
    </div>
  );
}
