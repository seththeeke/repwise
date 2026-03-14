import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, Dumbbell, History } from 'lucide-react';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import { workoutsApi } from '@/api/workouts';
import { ExecutionHeader } from './ExecutionHeader';
import { WeightEntryCard } from './WeightEntryCard';
import { DurationTimerCard } from './DurationTimerCard';
import { CancelWorkoutModal } from './CancelWorkoutModal';
import { ExerciseModality } from '@/types';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatRelative(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString();
}

export function WorkoutExecutionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const activeWorkoutId = useWorkoutSessionStore((s) => s.activeWorkoutId);
  const currentExerciseIndex = useWorkoutSessionStore((s) => s.currentExerciseIndex);
  const exercises = useWorkoutSessionStore((s) => s.exercises);
  const startedAt = useWorkoutSessionStore((s) => s.startedAt);
  const elapsedSeconds = useWorkoutSessionStore((s) => s.elapsedSeconds);
  const isPaused = useWorkoutSessionStore((s) => s.isPaused);
  const updateExercise = useWorkoutSessionStore((s) => s.updateExercise);
  const goToExercise = useWorkoutSessionStore((s) => s.goToExercise);
  const pauseSession = useWorkoutSessionStore((s) => s.pauseSession);
  const resumeSession = useWorkoutSessionStore((s) => s.resumeSession);
  const clearSession = useWorkoutSessionStore((s) => s.clearSession);
  const startSession = useWorkoutSessionStore((s) => s.startSession);

  const [weightInput, setWeightInput] = useState('');
  const [durationElapsed, setDurationElapsed] = useState(0);
  const [durationRunning, setDurationRunning] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const patchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const workoutId = id ?? activeWorkoutId;
  const currentExercise = exercises[currentExerciseIndex];
  const totalExercises = exercises.length;
  const isLast = currentExerciseIndex === totalExercises - 1;
  const isFirst = currentExerciseIndex === 0;

  // Hydrate from API if we have id but store is empty or different
  useEffect(() => {
    if (!workoutId) return;
    if (exercises.length === 0 || activeWorkoutId !== workoutId) {
      workoutsApi
        .getById(workoutId)
        .then((wi) => {
          startSession(wi.workoutInstanceId, wi.exercises);
        })
        .catch(() => {
          navigate('/dashboard');
        });
    }
  }, [workoutId, activeWorkoutId, exercises.length, startSession, navigate]);

  const tickElapsed = useWorkoutSessionStore((s) => s.tickElapsed);

  // Elapsed timer
  useEffect(() => {
    if (!isPaused && startedAt) {
      elapsedIntervalRef.current = setInterval(() => tickElapsed(), 1000);
    }
    return () => {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, [isPaused, startedAt, tickElapsed]);

  // Duration exercise timer
  useEffect(() => {
    if (durationRunning) {
      durationIntervalRef.current = setInterval(() => {
        setDurationElapsed((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, [durationRunning]);

  // Sync weight input when changing exercise
  useEffect(() => {
    if (currentExercise) {
      setWeightInput(currentExercise.weight?.toString() ?? '');
      setDurationElapsed(0);
      setDurationRunning(false);
    }
  }, [currentExerciseIndex, currentExercise?.exerciseId]);

  const debouncedPatch = useCallback(() => {
    if (!workoutId) return;
    if (patchTimeoutRef.current) clearTimeout(patchTimeoutRef.current);
    patchTimeoutRef.current = setTimeout(() => {
      const state = useWorkoutSessionStore.getState();
      workoutsApi.patch(workoutId, { exercises: state.exercises }).catch(() => {});
      patchTimeoutRef.current = null;
    }, 500);
  }, [workoutId]);

  const handleWeightChange = (value: string) => {
    setWeightInput(value);
    const num = parseFloat(value);
    if (!Number.isNaN(num)) {
      updateExercise(currentExerciseIndex, { weight: num, weightUnit: 'LBS' });
      debouncedPatch();
    }
  };

  const handleNext = () => {
    if (currentExercise?.modality === ExerciseModality.SETS_REPS && weightInput) {
      updateExercise(currentExerciseIndex, {
        weight: parseFloat(weightInput),
        weightUnit: 'LBS',
      });
    }
    debouncedPatch();
    if (isLast) setShowCompleteConfirm(true);
    else goToExercise(currentExerciseIndex + 1);
  };

  const handlePrevious = () => {
    if (!isFirst) goToExercise(currentExerciseIndex - 1);
  };

  const handleSkip = () => {
    updateExercise(currentExerciseIndex, { skipped: true });
    debouncedPatch();
    if (isLast) setShowCompleteConfirm(true);
    else goToExercise(currentExerciseIndex + 1);
  };

  const handleComplete = async () => {
    if (!workoutId) return;
    setShowCompleteConfirm(false);
    const state = useWorkoutSessionStore.getState();
    try {
      await workoutsApi.patch(workoutId, {
        status: 'completed',
        exercises: state.exercises,
      });
      clearSession();
      navigate('/dashboard');
    } catch {
      clearSession();
      navigate('/dashboard');
    }
  };

  const handleCancel = async () => {
    setShowCancelModal(false);
    if (workoutId) {
      try {
        await workoutsApi.cancel(workoutId);
      } catch {}
    }
    clearSession();
    navigate('/dashboard');
  };

  const handleDurationComplete = () => {
    updateExercise(currentExerciseIndex, {
      weight: 0,
      weightUnit: 'LBS',
    });
    debouncedPatch();
    if (isLast) setShowCompleteConfirm(true);
    else goToExercise(currentExerciseIndex + 1);
  };

  if (!workoutId || !currentExercise) {
    return (
      <div className="min-h-screen bg-surface-dark flex items-center justify-center">
        <p className="text-gray-400">Loading workout...</p>
      </div>
    );
  }

  const lastPerformed =
    currentExercise.lastUsedWeight != null
      ? {
          weight: currentExercise.lastUsedWeight,
          date: currentExercise.lastPerformedDate,
          sets: currentExercise.sets,
          reps: currentExercise.reps,
        }
      : null;

  return (
    <div className="min-h-screen bg-surface-dark text-white flex flex-col">
      <ExecutionHeader
        elapsedSeconds={elapsedSeconds}
        isPaused={isPaused}
        onPauseResume={() => (isPaused ? resumeSession() : pauseSession())}
        onCancel={() => setShowCancelModal(true)}
        onSkip={handleSkip}
      />

      <div className="px-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-gray-400">
            Exercise {currentExerciseIndex + 1} of {totalExercises}
          </span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((currentExerciseIndex + 1) / totalExercises) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col px-4 pb-4">
        <div className="flex-1 flex flex-col items-center justify-center">
          {lastPerformed && (
            <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-gray-800/50 rounded-full">
              <History className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">
                Last: <span className="text-white font-medium">{lastPerformed.weight} lbs</span>
                {lastPerformed.sets != null && lastPerformed.reps != null && (
                  <span className="text-gray-500"> ({lastPerformed.sets}×{lastPerformed.reps})</span>
                )}
                {lastPerformed.date && (
                  <span className="text-gray-500"> · {formatRelative(lastPerformed.date)}</span>
                )}
              </span>
            </div>
          )}

          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mb-6">
            <Dumbbell className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-6">{currentExercise.exerciseName}</h1>

          {currentExercise.modality === ExerciseModality.DURATION ? (
            <DurationTimerCard
              durationSeconds={currentExercise.durationSeconds ?? 60}
              elapsedSeconds={durationElapsed}
              isRunning={durationRunning}
              onStartPause={() => setDurationRunning((r) => !r)}
              onComplete={handleDurationComplete}
            />
          ) : (
            <WeightEntryCard
              weight={weightInput}
              onWeightChange={handleWeightChange}
              lastUsedWeight={currentExercise.lastUsedWeight}
              lastPerformedDate={currentExercise.lastPerformedDate}
              weightUnit="lbs"
              sets={currentExercise.sets}
              reps={currentExercise.reps}
              onUsePrevious={() =>
                currentExercise.lastUsedWeight != null &&
                setWeightInput(currentExercise.lastUsedWeight.toString())
              }
            />
          )}
        </div>

        <div className="flex gap-3 mt-auto pt-6">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={isFirst}
            className="flex-1 py-5 rounded-2xl bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 font-semibold text-lg flex items-center justify-center gap-2 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
            Previous
          </button>
          <button
            type="button"
            onClick={handleNext}
            className={`flex-1 py-5 rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 transition-colors ${
              isLast ? 'bg-accent-green hover:opacity-90' : 'bg-primary hover:bg-primary-dark'
            }`}
          >
            {isLast ? (
              <>
                Complete <Check className="w-6 h-6" />
              </>
            ) : (
              <>
                Next <ChevronRight className="w-6 h-6" />
              </>
            )}
          </button>
        </div>
      </div>

      <CancelWorkoutModal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
      />

      {showCompleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-2">Complete Workout?</h2>
            <p className="text-gray-400 mb-6">
              You've completed all {totalExercises} exercises in {formatTime(elapsedSeconds)}.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCompleteConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-gray-700 font-semibold hover:bg-gray-600 transition-colors"
              >
                Review
              </button>
              <button
                type="button"
                onClick={handleComplete}
                className="flex-1 py-3 rounded-xl bg-accent-green font-semibold hover:opacity-90 transition-opacity"
              >
                Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
