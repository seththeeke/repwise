export enum ExerciseModality {
  SETS_REPS = 'sets_reps',
  DURATION = 'duration',
  BURNOUT = 'burnout',
}

export enum WeightUnit {
  LBS = 'LBS',
  KG = 'KG',
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

export type Exercise = {
  exerciseId: string;
  name: string;
  muscleGroups: string[];
  equipment: string[];
  modality: ExerciseModality;
  defaultSets?: number;
  defaultReps?: number;
  defaultDurationSeconds?: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string;
};

export type WorkoutExercise = {
  exerciseId: string;
  exerciseName: string;
  modality: ExerciseModality;
  sets?: number;
  reps?: number;
  durationSeconds?: number;
  weight?: number;
  weightUnit?: WeightUnit;
  notes?: string;
  completedAt?: string;
  skipped: boolean;
  orderIndex: number;
};

export type WorkoutInstance = {
  workoutInstanceId: string;
  userId: string;
  status: WorkoutStatus;
  source: WorkoutSource;
  startedAt: string;
  completedAt?: string;
  durationMinutes?: number;
  totalVolume?: number;
  notes?: string;
  exercises: WorkoutExercise[];
};

export type User = {
  userId: string;
  email: string;
  username: string;
  displayName: string;
  weightUnit: WeightUnit;
};

export type UserProfile = {
  userId: string;
  email: string;
  username: string;
  displayName: string;
  bio?: string;
  profilePhoto?: string;
  isPrivate: boolean;
  weightUnit: WeightUnit;
  followersCount: number;
  followingCount: number;
  createdAt: string;
};

export type FeedItem = {
  eventId: string;
  eventType: 'workout_complete' | 'pr_hit';
  actorUserId: string;
  actorUsername: string;
  actorDisplayName: string;
  actorProfilePhoto?: string;
  summary: string;
  workoutSummary?: string;
  createdAt: string;
};

export type GlobalMetrics = {
  totalWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate?: string;
  workoutsLast30: number;
  totalVolumeAllTime: number;
  favoriteMuscleGroup?: string;
};

export type ExerciseMetrics = {
  exerciseId: string;
  exerciseName: string;
  totalSessions: number;
  maxWeight: number;
  maxWeightUnit: WeightUnit;
  lastPerformedDate: string;
  recentProgress: number;
};

export enum GoalType {
  TOTAL_WORKOUTS = 'total_workouts',
  WORKOUTS_PER_WEEK = 'workouts_per_week',
  TOTAL_VOLUME = 'total_volume',
  ONE_REP_MAX = 'one_rep_max',
  WORKOUT_STREAK = 'workout_streak',
  EXERCISE_SESSIONS = 'exercise_sessions',
  TOTAL_TIME = 'total_time',
}

export enum GoalStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum GoalTimeframe {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  ALL_TIME = 'all_time',
}

export type Goal = {
  goalId: string;
  userId: string;
  type: GoalType;
  status: GoalStatus;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  timeframe: GoalTimeframe;
  exerciseId?: string;
  exerciseName?: string;
  startDate: string;
  endDate?: string;
  completedAt?: string;
  createdAt: string;
};
