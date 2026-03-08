export enum PermissionType {
  PUBLIC = 'PUBLIC',
  FOLLOWERS_ONLY = 'FOLLOWERS_ONLY',
  PRIVATE = 'PRIVATE',
}

export enum WorkoutStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum WorkoutSource {
  AI_GENERATED = 'ai_generated',
  MANUAL = 'manual',
}

export enum ExerciseModality {
  SETS_REPS = 'sets_reps',
  DURATION = 'duration',
  BURNOUT = 'burnout',
}

export enum WeightUnit {
  LBS = 'LBS',
  KG = 'KG',
}

export enum FeedEventType {
  WORKOUT_COMPLETE = 'workout_complete',
  PR_HIT = 'pr_hit',
}

export enum FollowStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
}

export enum GoalType {
  TOTAL_WORKOUTS = 'total_workouts',
  WORKOUTS_PER_WEEK = 'workouts_per_week',
  TOTAL_VOLUME = 'total_volume',
  ONE_REP_MAX = 'one_rep_max',
  WORKOUT_STREAK = 'workout_streak',
  EXERCISE_SESSIONS = 'exercise_sessions',
}

export enum GoalTimeframe {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  ALL_TIME = 'all_time',
}

export enum GoalStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
