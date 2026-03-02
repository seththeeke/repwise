import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';
import { ExerciseModality, WeightUnit } from '../types/index';
import { getLastWeightForExercise } from '../data/mockData';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  SkipForward,
  Timer,
  Dumbbell,
  Play,
  Pause,
  History,
} from 'lucide-react';

export default function ActiveWorkoutPage() {
  const navigate = useNavigate();
  const { currentWorkout, recentWorkouts, updateExercise, completeWorkout, cancelWorkout } = useWorkout();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);
  const [exerciseTimer, setExerciseTimer] = useState(0);
  const [exerciseTimerRunning, setExerciseTimerRunning] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [weight, setWeight] = useState<string>('');

  const previousWeights = useMemo(() => {
    if (!currentWorkout) return {};
    const weights: Record<string, number | undefined> = {};
    currentWorkout.exercises.forEach((ex) => {
      weights[ex.exerciseId] = getLastWeightForExercise(ex.exerciseId, recentWorkouts);
    });
    return weights;
  }, [currentWorkout, recentWorkouts]);

  useEffect(() => {
    if (!currentWorkout) {
      navigate('/workout/new');
      return;
    }
  }, [currentWorkout, navigate]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    if (!exerciseTimerRunning) return;
    const interval = setInterval(() => {
      setExerciseTimer((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [exerciseTimerRunning]);

  useEffect(() => {
    if (currentWorkout?.exercises[currentIndex]) {
      const ex = currentWorkout.exercises[currentIndex];
      setWeight(ex.weight?.toString() || '');
      setExerciseTimer(0);
      setExerciseTimerRunning(false);
    }
  }, [currentIndex, currentWorkout]);

  if (!currentWorkout) return null;

  const currentExercise = currentWorkout.exercises[currentIndex];
  const totalExercises = currentWorkout.exercises.length;
  const isLastExercise = currentIndex === totalExercises - 1;
  const isFirstExercise = currentIndex === 0;
  const previousWeight = previousWeights[currentExercise.exerciseId];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  };

  const getLastPerformedInfo = () => {
    for (const workout of recentWorkouts) {
      const exercise = workout.exercises.find(
        (e) => e.exerciseId === currentExercise.exerciseId && e.weight
      );
      if (exercise) {
        return {
          weight: exercise.weight,
          date: workout.completedAt || workout.startedAt,
          sets: exercise.sets,
          reps: exercise.reps,
        };
      }
    }
    return null;
  };

  const lastPerformed = getLastPerformedInfo();

  const handleSaveExercise = () => {
    if (weight) {
      updateExercise(currentIndex, {
        weight: parseFloat(weight),
        weightUnit: WeightUnit.LBS,
      });
    }
  };

  const handleNext = () => {
    handleSaveExercise();
    if (isLastExercise) {
      setShowCompleteConfirm(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    handleSaveExercise();
    if (!isFirstExercise) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    updateExercise(currentIndex, { skipped: true });
    if (isLastExercise) {
      setShowCompleteConfirm(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleComplete = () => {
    handleSaveExercise();
    completeWorkout();
    navigate('/');
  };

  const handleCancel = () => {
    cancelWorkout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-2">Cancel Workout?</h2>
            <p className="text-gray-400 mb-6">Your progress will not be saved.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-gray-700 font-semibold hover:bg-gray-600 transition-colors"
              >
                Keep Going
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 py-3 rounded-xl bg-red-600 font-semibold hover:bg-red-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Confirmation Modal */}
      {showCompleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-2">Complete Workout?</h2>
            <p className="text-gray-400 mb-6">
              You've completed all {totalExercises} exercises in {formatTime(elapsedSeconds)}.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCompleteConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-gray-700 font-semibold hover:bg-gray-600 transition-colors"
              >
                Review
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 py-3 rounded-xl bg-green-600 font-semibold hover:bg-green-700 transition-colors"
              >
                Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => setShowCancelConfirm(true)}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full">
          <Timer className="w-4 h-4 text-violet-400" />
          <span className="font-mono text-lg">{formatTime(elapsedSeconds)}</span>
          <button
            onClick={() => setTimerRunning(!timerRunning)}
            className="ml-2 p-1 hover:bg-gray-700 rounded"
          >
            {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>

        <button
          onClick={handleSkip}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-gray-400">
            Exercise {currentIndex + 1} of {totalExercises}
          </span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 transition-all"
            style={{ width: `${((currentIndex + 1) / totalExercises) * 100}%` }}
          />
        </div>
      </div>

      {/* Exercise Card */}
      <div className="flex-1 flex flex-col px-4 pb-4">
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Previous Workout Info */}
          {lastPerformed && (
            <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-gray-800/50 rounded-full">
              <History className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">
                Last: <span className="text-white font-medium">{lastPerformed.weight} lbs</span>
                {lastPerformed.sets && lastPerformed.reps && (
                  <span className="text-gray-500"> ({lastPerformed.sets}×{lastPerformed.reps})</span>
                )}
                <span className="text-gray-500"> · {formatRelativeTime(lastPerformed.date)}</span>
              </span>
            </div>
          )}

          {/* Exercise Info */}
          <div className="w-20 h-20 bg-violet-600 rounded-2xl flex items-center justify-center mb-6">
            <Dumbbell className="w-10 h-10" />
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">{currentExercise.exerciseName}</h1>

          {currentExercise.modality === ExerciseModality.DURATION ? (
            <div className="text-center">
              <p className="text-gray-400 mb-4">Duration: {currentExercise.durationSeconds} seconds</p>
              <div className="bg-gray-800 rounded-2xl p-6 mb-4">
                <p className="text-5xl font-mono font-bold">{formatTime(exerciseTimer)}</p>
              </div>
              <button
                onClick={() => setExerciseTimerRunning(!exerciseTimerRunning)}
                className={`px-8 py-3 rounded-xl font-semibold text-lg transition-colors ${
                  exerciseTimerRunning
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-violet-600 hover:bg-violet-700'
                }`}
              >
                {exerciseTimerRunning ? (
                  <span className="flex items-center gap-2">
                    <Pause className="w-5 h-5" /> Pause
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Play className="w-5 h-5" /> Start Timer
                  </span>
                )}
              </button>
            </div>
          ) : (
            <div className="w-full max-w-xs">
              <p className="text-gray-400 text-center mb-6">
                {currentExercise.sets} sets × {currentExercise.reps} reps
              </p>

              <div className="bg-gray-800 rounded-2xl p-6">
                <label className="block text-sm text-gray-400 mb-2 text-center">Weight (lbs)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder={previousWeight?.toString() || '0'}
                  className="w-full text-center text-5xl font-bold bg-transparent border-none outline-none focus:ring-0 placeholder-gray-600"
                />
              </div>

              {/* Quick Weight Buttons */}
              <div className="flex gap-2 mt-4">
                {[5, 10, 25, 45].map((w) => (
                  <button
                    key={w}
                    onClick={() => {
                      const currentWeight = parseFloat(weight) || previousWeight || 0;
                      setWeight((currentWeight + w).toString());
                    }}
                    className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    +{w}
                  </button>
                ))}
              </div>

              {/* Use Previous Weight Button */}
              {previousWeight && !weight && (
                <button
                  onClick={() => setWeight(previousWeight.toString())}
                  className="w-full mt-3 py-2 text-violet-400 hover:text-violet-300 text-sm font-medium transition-colors"
                >
                  Use previous weight ({previousWeight} lbs)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-auto pt-6">
          <button
            onClick={handlePrevious}
            disabled={isFirstExercise}
            className="flex-1 py-5 rounded-2xl bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 font-semibold text-lg flex items-center justify-center gap-2 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
            Previous
          </button>

          <button
            onClick={handleNext}
            className={`flex-1 py-5 rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 transition-colors ${
              isLastExercise
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-violet-600 hover:bg-violet-700'
            }`}
          >
            {isLastExercise ? (
              <>
                Complete
                <Check className="w-6 h-6" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-6 h-6" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Exercise Navigation Dots */}
      <div className="flex justify-center gap-2 pb-6">
        {currentWorkout.exercises.map((ex, i) => (
          <button
            key={i}
            onClick={() => {
              handleSaveExercise();
              setCurrentIndex(i);
            }}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              i === currentIndex
                ? 'bg-violet-500 w-6'
                : ex.skipped
                ? 'bg-gray-600'
                : ex.weight
                ? 'bg-green-500'
                : 'bg-gray-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
