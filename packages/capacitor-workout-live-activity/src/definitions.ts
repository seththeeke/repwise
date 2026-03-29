export type WorkoutModality = 'SETS_REPS' | 'DURATION';

export interface WorkoutLiveActivityPayload {
  workoutId: string;
  /** Shown on Dynamic Island / lock screen (e.g. notes, gym, or “Workout”). */
  workoutName?: string;
  exerciseName: string;
  sessionElapsedSeconds: number;
  /** ISO 8601 — with `totalPausedMs` / `pauseStartedAt`, native can tick the timer while locked. */
  workoutStartedAt: string;
  totalPausedMs: number;
  pauseStartedAt?: string | null;
  isPaused: boolean;
  modality: WorkoutModality;
  /** Planned sets/reps for SETS_REPS exercises (defaults applied in JS if missing). */
  targetSets?: number;
  targetReps?: number;
  weight?: number;
  weightUnit?: string;
  durationSeconds?: number;
  /** Wall-clock seconds remaining in the duration segment (derived in JS). */
  durationRemainingSeconds?: number;
  /** ISO 8601 — when the duration segment ends (for native timer UI). */
  durationEndDate?: string;
}

export interface WorkoutLiveActivityPlugin {
  startWorkoutActivity(payload: WorkoutLiveActivityPayload): Promise<void>;
  updateWorkoutActivity(payload: WorkoutLiveActivityPayload): Promise<void>;
  endWorkoutActivity(): Promise<void>;
}
