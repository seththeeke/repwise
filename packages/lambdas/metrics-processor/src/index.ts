import type { DynamoDBStreamEvent } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  ddb,
  WORKOUTS_TABLE,
  METRICS_TABLE,
  type GlobalMetrics,
  type ExerciseMetrics,
  type WorkoutInstance,
  type WorkoutExercise,
  type TrendDataPoint,
  type PRRecord,
  WeightUnit,
  evaluateGoals,
} from '@repwise/shared';

const METRIC_GLOBAL_SK = 'METRIC#GLOBAL';
const METRIC_EXERCISE_PREFIX = 'METRIC#EXERCISE#';
const MS_PER_DAY = 86400000;

function calculateStreak(
  lastWorkoutDate: string | undefined,
  currentStreak: number
): number {
  if (!lastWorkoutDate) return 1;
  const last = new Date(lastWorkoutDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - last.getTime()) / MS_PER_DAY);
  if (diffDays === 0) return currentStreak;
  if (diffDays === 1) return currentStreak + 1;
  return 1;
}

async function countWorkoutsInRange(
  userId: string,
  days: number
): Promise<number> {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 1);
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  const startStr = start.toISOString().split('T')[0] + 'T00:00:00.000Z';
  const endStr = end.toISOString().split('T')[0] + 'T00:00:00.000Z';

  let count = 0;
  let lastKey: Record<string, unknown> | undefined;
  do {
    const out = await ddb.send(
      new QueryCommand({
        TableName: WORKOUTS_TABLE,
        IndexName: 'userId-completedAt-index',
        KeyConditionExpression:
          'userId = :uid AND completedAt BETWEEN :start AND :end',
        ExpressionAttributeValues: {
          ':uid': userId,
          ':start': startStr,
          ':end': endStr,
        },
        ExclusiveStartKey: lastKey,
        Select: 'COUNT',
      })
    );
    count += out.Count ?? 0;
    lastKey = out.LastEvaluatedKey;
  } while (lastKey);
  return count;
}

function avgWeightInWindow(
  trendData: TrendDataPoint[],
  days: number
): number | undefined {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const inWindow = trendData.filter((p) => p.date >= cutoffStr);
  if (inWindow.length === 0) return undefined;
  const sum = inWindow.reduce((a, p) => a + p.avgWeight, 0);
  return Math.round((sum / inWindow.length) * 100) / 100;
}

export const handler = async (
  event: DynamoDBStreamEvent
): Promise<void> => {
  for (const record of event.Records) {
    if (record.eventName !== 'MODIFY') continue;
    const newImage = unmarshall(
      record.dynamodb!.NewImage! as Parameters<typeof unmarshall>[0]
    ) as WorkoutInstance;
    const oldImage = unmarshall(
      record.dynamodb!.OldImage! as Parameters<typeof unmarshall>[0]
    ) as WorkoutInstance;
    if (newImage.status !== 'completed' || oldImage.status === 'completed')
      continue;

    await processWorkoutCompletion(newImage);
  }
};

async function processWorkoutCompletion(
  workout: WorkoutInstance
): Promise<void> {
  const userId = workout.userId;
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  const existingOut = await ddb.send(
    new GetCommand({
      TableName: METRICS_TABLE,
      Key: { PK: `USER#${userId}`, SK: METRIC_GLOBAL_SK },
    })
  );
  const existing = (existingOut.Item ?? {
    totalWorkouts: 0,
    currentStreak: 0,
    longestStreak: 0,
    workoutsLast30: 0,
    workoutsLast90: 0,
    workoutsLast180: 0,
    totalVolumeAllTime: 0,
    completedDates: [],
  }) as GlobalMetrics;

  const newStreak = calculateStreak(existing.lastWorkoutDate, existing.currentStreak);
  const updatedGlobal: GlobalMetrics = {
    PK: `USER#${userId}`,
    SK: METRIC_GLOBAL_SK,
    userId,
    totalWorkouts: existing.totalWorkouts + 1,
    currentStreak: newStreak,
    longestStreak: Math.max(existing.longestStreak, newStreak),
    lastWorkoutDate: today,
    workoutsLast30: await countWorkoutsInRange(userId, 30),
    workoutsLast90: await countWorkoutsInRange(userId, 90),
    workoutsLast180: await countWorkoutsInRange(userId, 180),
    totalVolumeAllTime:
      existing.totalVolumeAllTime + (workout.totalVolume ?? 0),
    completedDates: Array.from(
      new Set([...(existing.completedDates ?? []), today])
    ),
    updatedAt: now,
  };

  const nonSkipped = (workout.exercises ?? []).filter(
    (e: WorkoutExercise) => !e.skipped
  );
  const exerciseMetricsItems: Record<string, unknown>[] = [];

  for (const ex of nonSkipped) {
    const sk = `${METRIC_EXERCISE_PREFIX}${ex.exerciseId}`;
    const existingEmOut = await ddb.send(
      new GetCommand({
        TableName: METRICS_TABLE,
        Key: { PK: `USER#${userId}`, SK: sk },
      })
    );
    const existingEm = existingEmOut.Item as ExerciseMetrics | undefined;
    const weight = ex.weight ?? 0;
    const weightUnit = (ex.weightUnit as WeightUnit) ?? WeightUnit.LBS;
    const totalVolume = (ex.sets ?? 0) * (ex.reps ?? 0) * weight;
    const trendPoint: TrendDataPoint = {
      date: today,
      avgWeight: weight,
      weightUnit,
      totalVolume,
    };

    let personalRecordHistory: PRRecord[] =
      existingEm?.personalRecordHistory ?? [];
    let maxWeight = existingEm?.maxWeight ?? 0;
    let maxWeightDate = existingEm?.maxWeightDate ?? today;
    if (weight > maxWeight) {
      maxWeight = weight;
      maxWeightDate = today;
      personalRecordHistory = [
        ...personalRecordHistory,
        {
          weight,
          weightUnit,
          achievedAt: now,
          workoutInstanceId: workout.workoutInstanceId,
        },
      ];
    }

    const trendData = [...(existingEm?.trendData ?? []), trendPoint];
    const updatedEm: ExerciseMetrics = {
      PK: `USER#${userId}`,
      SK: sk,
      userId,
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName ?? ex.exerciseId,
      totalSessions: (existingEm?.totalSessions ?? 0) + 1,
      maxWeight,
      maxWeightUnit: weightUnit,
      maxWeightDate,
      lastPerformedDate: today,
      lastUsedWeight: weight,
      lastUsedWeightUnit: weightUnit,
      avgWeightLast30: avgWeightInWindow(trendData, 30),
      avgWeightLast90: avgWeightInWindow(trendData, 90),
      avgWeightLast180: avgWeightInWindow(trendData, 180),
      personalRecordHistory,
      trendData,
      updatedAt: now,
    };
    exerciseMetricsItems.push(updatedEm as unknown as Record<string, unknown>);
  }

  const transactItems: Record<string, unknown>[] = [
    {
      Put: {
        TableName: METRICS_TABLE,
        Item: updatedGlobal as unknown as Record<string, unknown>,
      },
    },
    ...exerciseMetricsItems.map((item) => ({
      Put: {
        TableName: METRICS_TABLE,
        Item: item,
      },
    })),
  ];

  if (transactItems.length > 100) {
    for (let i = 0; i < transactItems.length; i += 100) {
      const chunk = transactItems.slice(i, i + 100);
      await ddb.send(
        new TransactWriteCommand({ TransactItems: chunk as never })
      );
    }
  } else {
    await ddb.send(
      new TransactWriteCommand({ TransactItems: transactItems as never })
    );
  }

  await evaluateGoals(userId, updatedGlobal, workout);
}
