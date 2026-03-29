import {
  computeDurationElapsedSeconds,
  computeSessionElapsedSeconds,
} from '@/stores/workoutSessionStore';
import type { WorkoutLiveActivityPayload } from 'capacitor-workout-live-activity';
import { ExerciseModality } from '@/types';
import type { WorkoutSessionStore } from '@/stores/workoutSessionStore';

export type SessionSlice = Pick<
  WorkoutSessionStore,
  | 'startedAt'
  | 'totalPausedMs'
  | 'isPaused'
  | 'pauseStartedAt'
  | 'currentExerciseIndex'
  | 'exercises'
  | 'workoutDisplayName'
  | 'durationExerciseIndex'
  | 'durationRunning'
  | 'durationStartedAt'
  | 'durationAccumulatedSeconds'
>;

export function buildWorkoutLiveActivityPayload(
  state: SessionSlice,
  workoutId: string
): WorkoutLiveActivityPayload {
  const ex = state.exercises[state.currentExerciseIndex];
  const modality =
    ex?.modality === ExerciseModality.DURATION ? 'DURATION' : 'SETS_REPS';
  const targetSets = ex?.sets ?? 3;
  const targetReps = ex?.reps ?? 8;
  const sessionElapsedSeconds = computeSessionElapsedSeconds(state);
  const durationElapsed = computeDurationElapsedSeconds(state);
  const durationSeconds = ex?.durationSeconds ?? 60;
  const remaining = Math.max(0, durationSeconds - durationElapsed);

  let durationEndDate: string | undefined;
  if (modality === 'DURATION' && state.durationRunning && state.durationStartedAt) {
    const endMs = new Date(state.durationStartedAt).getTime() + remaining * 1000;
    durationEndDate = new Date(endMs).toISOString();
  }

  const workoutName =
    state.workoutDisplayName?.trim() ||
    undefined;

  return {
    workoutId,
    ...(workoutName ? { workoutName } : {}),
    exerciseName: ex?.exerciseName ?? 'Workout',
    sessionElapsedSeconds,
    workoutStartedAt: state.startedAt ?? '',
    totalPausedMs: state.totalPausedMs,
    pauseStartedAt: state.pauseStartedAt ?? undefined,
    isPaused: state.isPaused,
    modality,
    ...(modality === 'SETS_REPS'
      ? { targetSets, targetReps }
      : {}),
    weight: ex?.weight ?? undefined,
    weightUnit: ex?.weightUnit ?? undefined,
    durationSeconds: modality === 'DURATION' ? durationSeconds : undefined,
    durationRemainingSeconds: modality === 'DURATION' ? remaining : undefined,
    durationEndDate,
  };
}
