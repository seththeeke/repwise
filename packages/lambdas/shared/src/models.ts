import {
  PermissionType,
  WorkoutStatus,
  WorkoutSource,
  ExerciseModality,
  WeightUnit,
  FeedEventType,
  FollowStatus,
  GoalType,
  GoalTimeframe,
  GoalStatus,
} from './enums';

/** User-owned gym: name + equipment types for filtering exercises. */
export interface Gym {
  PK: string;   // USER#<userId>
  SK: string;   // GYM#<gymId>
  gymId: string;
  userId: string;
  name: string;
  equipmentTypes: string[]; // e.g. dumbbells, free_weights, cables, weight_rack, cardio, machines
}

export interface UserProfile {
  PK: string;
  SK: string;
  userId: string;
  email: string;
  username: string;
  displayName: string;
  profilePhoto?: string;
  bio?: string;
  isPrivate: boolean;
  weightUnit: WeightUnit;
  defaultPermissionType: PermissionType;
  defaultGymId?: string;
  onboardingCompletedAt?: string;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  streakCount: number;
  lastWorkoutDate?: string;
}

export interface FollowRelationship {
  PK: string;
  SK: string;
  followedAt: string;
  status: FollowStatus;
  targetUserId: string;
}

export interface FollowerRelationship {
  PK: string;
  SK: string;
  followedAt: string;
  status: FollowStatus;
  sourceUserId: string;
}

export interface FeedItem {
  PK: string;
  SK: string;
  eventId: string;
  eventType: FeedEventType;
  actorUserId: string;
  actorUsername: string;
  actorDisplayName: string;
  actorProfilePhoto?: string;
  summary: string;
  workoutInstanceId?: string;
  isPublic: boolean;
  createdAt: string;
}

export interface ExerciseCatalogItem {
  PK: string;
  SK: string;
  exerciseId: string;
  name: string;
  muscleGroups: string[];
  muscleGroup: string;
  equipment: string[];
  equipmentPrimary: string;
  modality: ExerciseModality;
  defaultSets?: number;
  defaultReps?: number;
  defaultDurationSeconds?: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string;
  isActive: boolean;
}

export interface WorkoutExercise {
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
  lastUsedWeight?: number;
  lastUsedWeightUnit?: WeightUnit;
  lastPerformedDate?: string;
}

export interface WorkoutInstance {
  PK: string;
  SK: string;
  workoutInstanceId: string;
  userId: string;
  status: WorkoutStatus;
  source: WorkoutSource;
  permissionType: PermissionType;
  startedAt: string;
  completedAt?: string;
  durationMinutes?: number;
  totalVolume?: number;
  notes?: string;
  gymId?: string;
  gymName?: string;
  exercises: WorkoutExercise[];
}

export interface PRRecord {
  weight: number;
  weightUnit: WeightUnit;
  achievedAt: string;
  workoutInstanceId: string;
}

export interface TrendDataPoint {
  date: string;
  avgWeight: number;
  weightUnit: WeightUnit;
  totalVolume: number;
}

export interface ExerciseMetrics {
  PK: string;
  SK: string;
  userId: string;
  exerciseId: string;
  exerciseName: string;
  totalSessions: number;
  maxWeight: number;
  maxWeightUnit: WeightUnit;
  maxWeightDate: string;
  lastPerformedDate: string;
  lastUsedWeight: number;
  lastUsedWeightUnit: WeightUnit;
  avgWeightLast30?: number;
  avgWeightLast90?: number;
  avgWeightLast180?: number;
  personalRecordHistory: PRRecord[];
  trendData: TrendDataPoint[];
  updatedAt: string;
}

export interface GlobalMetrics {
  PK: string;
  SK: string;
  userId: string;
  totalWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate?: string;
  workoutsLast30: number;
  workoutsLast90: number;
  workoutsLast180: number;
  totalVolumeAllTime: number;
  favoriteMuscleGroup?: string;
  completedDates: string[];
  updatedAt: string;
}

export interface Goal {
  PK: string;
  SK: string;
  goalId: string;
  userId: string;
  type: GoalType;
  status: GoalStatus;
  title: string;
  description?: string;
  timeframe: GoalTimeframe;
  targetValue: number;
  currentValue: number;
  unit?: string;
  exerciseId?: string;
  exerciseName?: string;
  startDate: string;
  endDate?: string;
  completedAt?: string;
  createdAt: string;
}
