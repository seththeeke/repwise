import { QueryCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, METRICS_TABLE, WORKOUTS_TABLE } from './ddb';
import type { Goal, GlobalMetrics, ExerciseMetrics, WorkoutInstance } from './models';
import { GoalType, GoalStatus } from './enums';
import { isGoalWindowActive } from './goalUtils';

const METRIC_GLOBAL_SK = 'METRIC#GLOBAL';
const METRIC_EXERCISE_PREFIX = 'METRIC#EXERCISE#';
const GOAL_PREFIX = 'GOAL#';

export async function getGlobalMetrics(userId: string): Promise<GlobalMetrics | null> {
  const out = await ddb.send(
    new GetCommand({
      TableName: METRICS_TABLE,
      Key: { PK: `USER#${userId}`, SK: METRIC_GLOBAL_SK },
    })
  );
  return (out.Item as GlobalMetrics) ?? null;
}

export async function queryGoalsByStatus(
  userId: string,
  status: GoalStatus
): Promise<Goal[]> {
  const out = await ddb.send(
    new QueryCommand({
      TableName: METRICS_TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': GOAL_PREFIX,
        ':status': status,
      },
    })
  );
  return (out.Items ?? []) as Goal[];
}

export async function updateGoalProgress(
  userId: string,
  goalId: string,
  currentValue: number,
  status: GoalStatus
): Promise<void> {
  const now = new Date().toISOString();
  const updates: string[] = ['currentValue = :cv', '#status = :status', 'updatedAt = :now'];
  const names: Record<string, string> = { '#status': 'status' };
  const values: Record<string, unknown> = {
    ':cv': currentValue,
    ':status': status,
    ':now': now,
  };
  if (status === GoalStatus.COMPLETED) {
    updates.push('completedAt = :completedAt');
    values[':completedAt'] = now;
  }
  await ddb.send(
    new UpdateCommand({
      TableName: METRICS_TABLE,
      Key: { PK: `USER#${userId}`, SK: `${GOAL_PREFIX}${goalId}` },
      UpdateExpression: `SET ${updates.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
}

export async function updateGoalStatus(
  userId: string,
  goalId: string,
  status: GoalStatus
): Promise<void> {
  const now = new Date().toISOString();
  await ddb.send(
    new UpdateCommand({
      TableName: METRICS_TABLE,
      Key: { PK: `USER#${userId}`, SK: `${GOAL_PREFIX}${goalId}` },
      UpdateExpression: 'SET #status = :status, updatedAt = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status, ':now': now },
    })
  );
}

export async function getExerciseMetrics(
  userId: string,
  exerciseId: string
): Promise<ExerciseMetrics | null> {
  const out = await ddb.send(
    new GetCommand({
      TableName: METRICS_TABLE,
      Key: {
        PK: `USER#${userId}`,
        SK: `${METRIC_EXERCISE_PREFIX}${exerciseId}`,
      },
    })
  );
  return (out.Item as ExerciseMetrics) ?? null;
}

/** Count completed workouts in the ISO week (Mon–Sun) that contains the given date. */
export async function countWorkoutsInWeek(
  userId: string,
  dateInWeek: string
): Promise<number> {
  const d = new Date(dateInWeek);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = start of week
  d.setUTCDate(d.getUTCDate() + diff);
  const weekStart = d.toISOString().split('T')[0] + 'T00:00:00.000Z';
  d.setUTCDate(d.getUTCDate() + 7);
  const weekEnd = d.toISOString().split('T')[0] + 'T23:59:59.999Z';

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
          ':start': weekStart,
          ':end': weekEnd,
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

/** Sum totalVolume of completed workouts in [startDate, endDate]. */
export async function sumVolumeInWindow(
  userId: string,
  startDate: string | undefined,
  endDate: string | undefined
): Promise<number> {
  if (!startDate) return 0;
  const start = startDate.split('T')[0] + 'T00:00:00.000Z';
  const end = endDate
    ? endDate.split('T')[0] + 'T23:59:59.999Z'
    : new Date().toISOString();

  let total = 0;
  let lastKey: Record<string, unknown> | undefined;
  do {
    const out = await ddb.send(
      new QueryCommand({
        TableName: WORKOUTS_TABLE,
        IndexName: 'userId-completedAt-index',
        KeyConditionExpression:
          'userId = :uid AND completedAt BETWEEN :start AND :end',
        ExpressionAttributeValues: { ':uid': userId, ':start': start, ':end': end },
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of out.Items ?? []) {
      const w = item as WorkoutInstance;
      total += w.totalVolume ?? 0;
    }
    lastKey = out.LastEvaluatedKey;
  } while (lastKey);
  return total;
}

/** Compute current value for a goal from existing metrics (for initial sync and evaluation). */
export async function calculateCurrentGoalValue(
  userId: string,
  goal: Goal,
  globalMetrics: GlobalMetrics | null
): Promise<number> {
  const global = globalMetrics ?? {
    totalWorkouts: 0,
    currentStreak: 0,
    longestStreak: 0,
    workoutsLast30: 0,
    workoutsLast90: 0,
    workoutsLast180: 0,
    totalVolumeAllTime: 0,
    completedDates: [],
    updatedAt: '',
  };

  switch (goal.type) {
    case GoalType.TOTAL_WORKOUTS:
      return global.totalWorkouts;
    case GoalType.WORKOUTS_PER_WEEK:
      return countWorkoutsInWeek(userId, goal.startDate);
    case GoalType.TOTAL_VOLUME:
      return sumVolumeInWindow(userId, goal.startDate, goal.endDate);
    case GoalType.ONE_REP_MAX:
      if (goal.exerciseId) {
        const em = await getExerciseMetrics(userId, goal.exerciseId);
        return em?.maxWeight ?? 0;
      }
      return 0;
    case GoalType.WORKOUT_STREAK:
      return global.currentStreak;
    case GoalType.EXERCISE_SESSIONS:
      if (goal.exerciseId) {
        const em = await getExerciseMetrics(userId, goal.exerciseId);
        return em?.totalSessions ?? 0;
      }
      return 0;
    default:
      return 0;
  }
}

/** Evaluate all active goals after a workout completion; call from metrics processor. */
export async function evaluateGoals(
  userId: string,
  updatedGlobal: GlobalMetrics,
  workout: WorkoutInstance
): Promise<void> {
  const activeGoals = await queryGoalsByStatus(userId, GoalStatus.ACTIVE);

  for (const goal of activeGoals) {
    if (!isGoalWindowActive(goal)) {
      await updateGoalStatus(userId, goal.goalId, GoalStatus.FAILED);
      continue;
    }

    const newCurrentValue = await calculateCurrentGoalValue(userId, goal, updatedGlobal);
    const isNowComplete = newCurrentValue >= goal.targetValue;
    const newStatus = isNowComplete ? GoalStatus.COMPLETED : GoalStatus.ACTIVE;
    await updateGoalProgress(userId, goal.goalId, newCurrentValue, newStatus);
  }
}
