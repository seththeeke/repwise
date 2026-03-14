import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  ddb,
  METRICS_TABLE,
  getUserId,
  type GlobalMetrics,
  type ExerciseMetrics,
} from '@repwise/shared';
import * as res from '@repwise/shared';

const METRIC_GLOBAL_SK = 'METRIC#GLOBAL';
const METRIC_EXERCISE_PREFIX = 'METRIC#EXERCISE#';

function toGlobalResponse(g: GlobalMetrics): Record<string, unknown> {
  return {
    userId: g.userId,
    totalWorkouts: g.totalWorkouts,
    currentStreak: g.currentStreak,
    longestStreak: g.longestStreak,
    lastWorkoutDate: g.lastWorkoutDate,
    workoutsLast30: g.workoutsLast30,
    workoutsLast90: g.workoutsLast90,
    workoutsLast180: g.workoutsLast180,
    totalVolumeAllTime: g.totalVolumeAllTime,
    completedDates: g.completedDates ?? [],
    updatedAt: g.updatedAt,
  };
}

function toExerciseSummary(em: ExerciseMetrics): Record<string, unknown> {
  return {
    exerciseId: em.exerciseId,
    exerciseName: em.exerciseName,
    totalSessions: em.totalSessions,
    maxWeight: em.maxWeight,
    maxWeightUnit: em.maxWeightUnit,
    lastPerformedDate: em.lastPerformedDate,
    lastUsedWeight: em.lastUsedWeight,
  };
}

function toExerciseDetail(
  em: ExerciseMetrics,
  period?: string
): Record<string, unknown> {
  let trendData = em.trendData ?? [];
  if (period && period !== 'all') {
    const days =
      period === '30d' ? 30 : period === '90d' ? 90 : period === '180d' ? 180 : 0;
    if (days > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      trendData = trendData.filter((p) => p.date >= cutoffStr);
    }
  }
  return {
    exerciseId: em.exerciseId,
    exerciseName: em.exerciseName,
    totalSessions: em.totalSessions,
    maxWeight: em.maxWeight,
    maxWeightUnit: em.maxWeightUnit,
    maxWeightDate: em.maxWeightDate,
    lastPerformedDate: em.lastPerformedDate,
    lastUsedWeight: em.lastUsedWeight,
    lastUsedWeightUnit: em.lastUsedWeightUnit,
    avgWeightLast30: em.avgWeightLast30,
    avgWeightLast90: em.avgWeightLast90,
    avgWeightLast180: em.avgWeightLast180,
    personalRecordHistory: em.personalRecordHistory ?? [],
    trendData,
    updatedAt: em.updatedAt,
  };
}

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.rawPath ?? event.requestContext.http.path ?? '';
  const pathParams = event.pathParameters ?? {};
  const exerciseIdParam = pathParams.exerciseId;
  const queryParams = event.queryStringParameters ?? {};
  const userId = getUserId(event);
  const pk = `USER#${userId}`;
  console.log('[metrics] request', { method, path, userId, exerciseId: exerciseIdParam });

  try {
    if (method === 'GET' && path === '/metrics/me/global') {
      const out = await ddb.send(
        new GetCommand({
          TableName: METRICS_TABLE,
          Key: { PK: pk, SK: METRIC_GLOBAL_SK },
        })
      );
      const item = out.Item as GlobalMetrics | undefined;
      if (!item) return res.notFound('Global metrics');
      return res.ok(toGlobalResponse(item));
    }

    if (method === 'GET' && path === '/metrics/me/exercises') {
      const out = await ddb.send(
        new QueryCommand({
          TableName: METRICS_TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: {
            ':pk': pk,
            ':sk': METRIC_EXERCISE_PREFIX,
          },
        })
      );
      const items = (out.Items ?? []) as ExerciseMetrics[];
      return res.ok(items.map(toExerciseSummary));
    }

    if (method === 'GET' && exerciseIdParam) {
      const sk = `${METRIC_EXERCISE_PREFIX}${exerciseIdParam}`;
      const out = await ddb.send(
        new GetCommand({
          TableName: METRICS_TABLE,
          Key: { PK: pk, SK: sk },
        })
      );
      const item = out.Item as ExerciseMetrics | undefined;
      if (!item) return res.notFound('Exercise metrics');
      const period = queryParams.period;
      return res.ok(toExerciseDetail(item, period));
    }

    console.log('[metrics] no route matched', { method, path });
    return res.badRequest('Not found');
  } catch (err) {
    console.error('[metrics] handler error', { error: err, message: err instanceof Error ? err.message : String(err) });
    return res.serverError(err);
  }
};
