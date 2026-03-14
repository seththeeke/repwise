import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import {
  ddb,
  METRICS_TABLE,
  WORKOUTS_TABLE,
  getUserId,
  deriveEndDate,
  getGlobalMetrics,
  calculateCurrentGoalValue,
  updateGoalProgress,
  type Goal,
  type GlobalMetrics,
  GoalType,
  GoalStatus,
  GoalTimeframe,
  type ExerciseCatalogItem,
} from '@repwise/shared';
import * as res from '@repwise/shared';

const GOAL_PREFIX = 'GOAL#';
const EXERCISE_PK_PREFIX = 'EXERCISE#';
const METADATA_SK = 'METADATA';

function parseBody<T>(body: string | null): T | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

function toGoalResponse(g: Goal): Record<string, unknown> {
  return {
    goalId: g.goalId,
    userId: g.userId,
    type: g.type,
    status: g.status,
    title: g.title,
    description: g.description,
    timeframe: g.timeframe,
    targetValue: g.targetValue,
    currentValue: g.currentValue,
    unit: g.unit,
    exerciseId: g.exerciseId,
    exerciseName: g.exerciseName,
    startDate: g.startDate,
    endDate: g.endDate,
    completedAt: g.completedAt,
    createdAt: g.createdAt,
  };
}

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.rawPath ?? event.requestContext.http.path ?? '';
  const pathParams = event.pathParameters ?? {};
  const goalIdParam = pathParams.goalId;
  const queryParams = event.queryStringParameters ?? {};
  const userId = getUserId(event);
  const pk = `USER#${userId}`;

  try {
    // GET /goals/me
    if (method === 'GET' && path === '/goals/me') {
      const status = queryParams.status as GoalStatus | undefined;
      const out = await ddb.send(
        new QueryCommand({
          TableName: METRICS_TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ...(status
            ? {
                FilterExpression: '#status = :status',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: {
                  ':pk': pk,
                  ':sk': GOAL_PREFIX,
                  ':status': status,
                },
              }
            : {
                ExpressionAttributeValues: {
                  ':pk': pk,
                  ':sk': GOAL_PREFIX,
                },
              }),
        })
      );
      const items = (out.Items ?? []) as Goal[];
      return res.ok(items.map(toGoalResponse));
    }

    // POST /goals/me
    if (method === 'POST' && path === '/goals/me') {
      const body = parseBody<{
        type: string;
        title: string;
        description?: string;
        timeframe: string;
        targetValue: number;
        unit?: string;
        exerciseId?: string;
      }>(event.body ?? null);
      if (!body?.type || !body?.title || body?.targetValue == null)
        return res.badRequest('type, title, and targetValue required');
      const type = body.type as GoalType;
      if (
        (type === GoalType.ONE_REP_MAX || type === GoalType.EXERCISE_SESSIONS) &&
        !body.exerciseId
      )
        return res.badRequest('exerciseId required for ONE_REP_MAX and EXERCISE_SESSIONS');

      let exerciseName: string | undefined;
      if (body.exerciseId) {
        const exOut = await ddb.send(
          new GetCommand({
            TableName: WORKOUTS_TABLE,
            Key: {
              PK: `${EXERCISE_PK_PREFIX}${body.exerciseId}`,
              SK: METADATA_SK,
            },
          })
        );
        const ex = exOut.Item as ExerciseCatalogItem | undefined;
        if (!ex) return res.badRequest('exerciseId not found in catalog');
        exerciseName = ex.name;
      }

      const startDate = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
      const endDate = deriveEndDate(
        startDate,
        (body.timeframe as GoalTimeframe) ?? GoalTimeframe.MONTHLY
      );
      const goalId = crypto.randomUUID();
      const now = new Date().toISOString();
      const newGoal: Goal = {
        PK: pk,
        SK: `${GOAL_PREFIX}${goalId}`,
        goalId,
        userId,
        type,
        status: GoalStatus.ACTIVE,
        title: body.title,
        description: body.description,
        timeframe: (body.timeframe as GoalTimeframe) ?? GoalTimeframe.MONTHLY,
        targetValue: Number(body.targetValue),
        currentValue: 0,
        unit: body.unit,
        exerciseId: body.exerciseId,
        exerciseName,
        startDate,
        endDate,
        createdAt: now,
      };

      await ddb.send(
        new PutCommand({
          TableName: METRICS_TABLE,
          Item: newGoal as unknown as Record<string, unknown>,
        })
      );

      // Immediate sync of currentValue from existing metrics
      const globalMetrics = await getGlobalMetrics(userId);
      const initialValue = await calculateCurrentGoalValue(
        userId,
        newGoal,
        globalMetrics
      );
      if (initialValue > 0) {
        const isComplete = initialValue >= newGoal.targetValue;
        await updateGoalProgress(
          userId,
          newGoal.goalId,
          initialValue,
          isComplete ? GoalStatus.COMPLETED : GoalStatus.ACTIVE
        );
        newGoal.currentValue = initialValue;
        newGoal.status = isComplete ? GoalStatus.COMPLETED : GoalStatus.ACTIVE;
      }

      return res.created(toGoalResponse(newGoal));
    }

    // DELETE /goals/me/{goalId}
    const deleteGoalId = goalIdParam ?? (pathParams as Record<string, string>)['goalId'];
    if (method === 'DELETE' && deleteGoalId) {
      const sk = `${GOAL_PREFIX}${deleteGoalId}`;
      const out = await ddb.send(
        new GetCommand({
          TableName: METRICS_TABLE,
          Key: { PK: pk, SK: sk },
        })
      );
      const goal = out.Item as Goal | undefined;
      if (!goal) return res.notFound('Goal');
      if (goal.userId !== userId) return res.forbidden();
      await ddb.send(
        new DeleteCommand({
          TableName: METRICS_TABLE,
          Key: { PK: pk, SK: sk },
        })
      );
      return res.noContent();
    }

    return res.badRequest('Not found');
  } catch (err) {
    return res.serverError(err);
  }
};
