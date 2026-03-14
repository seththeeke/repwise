import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  BatchGetCommand,
} from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import {
  ddb,
  WORKOUTS_TABLE,
  METRICS_TABLE,
  USERS_TABLE,
  getUserId,
  runFeedFanout,
  type WorkoutInstance,
  type WorkoutExercise,
  type UserProfile,
  WorkoutStatus,
  WorkoutSource,
  PermissionType,
  WeightUnit,
} from '@repwise/shared';
import * as res from '@repwise/shared';

const WORKOUT_SK_PREFIX = 'WORKOUT#';
const PROFILE_SK = 'PROFILE';

function parseBody<T>(body: string | null): T | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

function toResponse(wi: WorkoutInstance): Record<string, unknown> {
  return {
    workoutInstanceId: wi.workoutInstanceId,
    userId: wi.userId,
    status: wi.status,
    source: wi.source,
    permissionType: wi.permissionType,
    startedAt: wi.startedAt,
    completedAt: wi.completedAt,
    durationMinutes: wi.durationMinutes,
    totalVolume: wi.totalVolume,
    notes: wi.notes,
    exercises: wi.exercises,
  };
}

async function enrichWithLastUsed(
  userId: string,
  exercises: WorkoutExercise[]
): Promise<WorkoutExercise[]> {
  if (exercises.length === 0) return exercises;
  const keys = exercises.map((ex) => ({
    PK: `USER#${userId}`,
    SK: `METRIC#EXERCISE#${ex.exerciseId}`,
  }));
  const out = await ddb.send(
    new BatchGetCommand({
      RequestItems: {
        [METRICS_TABLE]: { Keys: keys },
      },
    })
  );
  const metricsList = out.Responses?.[METRICS_TABLE] ?? [];
  const metricsMap = new Map<string, Record<string, unknown>>();
  for (const m of metricsList) {
    const sk = (m.SK as string) ?? '';
    const id = sk.startsWith('METRIC#EXERCISE#') ? sk.slice('METRIC#EXERCISE#'.length) : (m.exerciseId as string);
    if (id) metricsMap.set(id, m as Record<string, unknown>);
  }
  return exercises.map((ex) => {
    const m = metricsMap.get(ex.exerciseId);
    return {
      ...ex,
      lastUsedWeight: m?.lastUsedWeight as number | undefined,
      lastUsedWeightUnit: m?.lastUsedWeightUnit as WeightUnit | undefined,
      lastPerformedDate: m?.lastPerformedDate as string | undefined,
    };
  });
}

async function findWorkoutByUserIdAndId(
  userId: string,
  workoutInstanceId: string
): Promise<{ PK: string; SK: string } | null> {
  const out = await ddb.send(
    new QueryCommand({
      TableName: WORKOUTS_TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'workoutInstanceId = :id',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': WORKOUT_SK_PREFIX,
        ':id': workoutInstanceId,
      },
    })
  );
  const item = out.Items?.[0];
  if (!item) return null;
  const pk = item.PK;
  const sk = item.SK;
  if (pk === undefined || sk === undefined) return null;
  return { PK: String(pk), SK: String(sk) };
}

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.rawPath ?? event.requestContext.http.path ?? '';
  const pathParams = event.pathParameters ?? {};
  const idParam = pathParams.id;
  const queryParams = event.queryStringParameters ?? {};
  const userId = getUserId(event);

  try {
    // POST /workout-instances
    if (method === 'POST' && path === '/workout-instances') {
      const body = parseBody<{
        source?: string;
        permissionType?: string;
        exercises?: WorkoutExercise[];
        aiPrompt?: string;
      }>(event.body ?? null);
      if (body?.aiPrompt) {
        const aiLambdaArn = process.env.AI_LAMBDA_ARN;
        if (!aiLambdaArn) return res.serverError(new Error('AI generation not configured'));
        const lambda = new LambdaClient({});
        const payload = {
          userId,
          userPrompt: body.aiPrompt,
          weightUnit: undefined as string | undefined,
        };
        const profileOut = await ddb.send(
          new GetCommand({
            TableName: USERS_TABLE,
            Key: { PK: `USER#${userId}`, SK: PROFILE_SK },
          })
        );
        const profile = profileOut.Item as { weightUnit?: string } | undefined;
        if (profile?.weightUnit) payload.weightUnit = profile.weightUnit;
        const invokeResult = await lambda.send(
          new InvokeCommand({
            FunctionName: aiLambdaArn,
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify(payload),
          })
        );
        if (invokeResult.FunctionError)
          return res.serverError(new Error(invokeResult.FunctionError));
        const payloadResult = invokeResult.Payload
          ? JSON.parse(Buffer.from(invokeResult.Payload).toString()) as { exercises: WorkoutExercise[] }
          : { exercises: [] };
        return res.ok({ suggestedExercises: payloadResult.exercises ?? [] });
      }
      if (!body?.exercises?.length) return res.badRequest('exercises array required');
      const source = (body.source === 'ai_generated' ? WorkoutSource.AI_GENERATED : WorkoutSource.MANUAL) as WorkoutSource;
      const permissionType = (body.permissionType as PermissionType) ?? PermissionType.FOLLOWERS_ONLY;
      const exercises = await enrichWithLastUsed(userId, body.exercises);
      const now = new Date().toISOString();
      const workoutInstanceId = crypto.randomUUID();
      const sk = `${WORKOUT_SK_PREFIX}${now}#${workoutInstanceId}`;
      const item: WorkoutInstance = {
        PK: `USER#${userId}`,
        SK: sk,
        workoutInstanceId,
        userId,
        status: WorkoutStatus.IN_PROGRESS,
        source,
        permissionType,
        startedAt: now,
        exercises: exercises.map((e, i) => ({
          ...e,
          orderIndex: e.orderIndex ?? i,
          skipped: e.skipped ?? false,
        })),
      };
      await ddb.send(
        new PutCommand({
          TableName: WORKOUTS_TABLE,
          Item: item as unknown as Record<string, unknown>,
        })
      );
      return res.created(toResponse(item));
    }

    // GET /workout-instances
    if (method === 'GET' && path === '/workout-instances') {
      const status = queryParams.status;
      const nextToken = queryParams.nextToken;
      const limit = Math.min(parseInt(queryParams.limit ?? '20', 10) || 20, 50);
      let exclusiveStartKey: Record<string, unknown> | undefined;
      if (nextToken) {
        try {
          exclusiveStartKey = JSON.parse(
            Buffer.from(nextToken, 'base64').toString('utf8')
          ) as Record<string, unknown>;
        } catch {
          // ignore invalid nextToken
        }
      }
      const out = await ddb.send(
        new QueryCommand({
          TableName: WORKOUTS_TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':sk': WORKOUT_SK_PREFIX,
          },
          Limit: limit,
          ScanIndexForward: false,
          ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
        })
      );
      let items = (out.Items ?? []) as WorkoutInstance[];
      if (status) items = items.filter((i) => i.status === status);
      const next = out.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(out.LastEvaluatedKey)).toString('base64')
        : undefined;
      return res.ok({ items: items.map(toResponse), nextToken: next });
    }

    // GET /workout-instances/{id}
    if (method === 'GET' && idParam) {
      const key = await findWorkoutByUserIdAndId(userId, idParam as string);
      if (!key) return res.notFound('Workout');
      const out = await ddb.send(
        new GetCommand({ TableName: WORKOUTS_TABLE, Key: key })
      );
      const item = out.Item as WorkoutInstance | undefined;
      if (!item) return res.notFound('Workout');
      return res.ok(toResponse(item));
    }

    // PATCH /workout-instances/{id}
    if (method === 'PATCH' && idParam) {
      const key = await findWorkoutByUserIdAndId(userId, idParam as string);
      if (!key) return res.notFound('Workout');
      const existing = await ddb.send(
        new GetCommand({ TableName: WORKOUTS_TABLE, Key: key })
      );
      const current = existing.Item as WorkoutInstance | undefined;
      if (!current) return res.notFound('Workout');
      if (current.status === WorkoutStatus.COMPLETED || current.status === WorkoutStatus.CANCELLED) {
        return res.badRequest('Cannot modify completed or cancelled workout');
      }
      const body = parseBody<{
        status?: string;
        notes?: string;
        permissionType?: string;
        exercises?: Array<Partial<WorkoutExercise> & { exerciseId: string }>;
      }>(event.body ?? null);
      if (!body) return res.badRequest('Invalid JSON');

      if (body.status === 'cancelled') {
        const updated = await ddb.send(
          new UpdateCommand({
            TableName: WORKOUTS_TABLE,
            Key: key,
            UpdateExpression: 'SET #status = :status',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':status': WorkoutStatus.CANCELLED },
            ReturnValues: 'ALL_NEW',
          })
        );
        return res.ok(toResponse(updated.Attributes as WorkoutInstance));
      }

      if (body.status === 'completed') {
        const exercises = (body.exercises?.length
          ? current.exercises.map((ex) => {
              const patch = body.exercises!.find((e) => e.exerciseId === ex.exerciseId);
              return patch ? { ...ex, ...patch } : ex;
            })
          : current.exercises) as WorkoutExercise[];
        const allHaveWeight = exercises
          .filter((e) => !e.skipped)
          .every((e) => e.modality === 'duration' ? e.durationSeconds != null : e.weight != null);
        if (!allHaveWeight) return res.badRequest('All non-skipped exercises must have weight or duration');
        const completedAt = new Date().toISOString();
        const started = new Date(current.startedAt).getTime();
        const durationMinutes = Math.round((new Date(completedAt).getTime() - started) / 60000);
        let totalVolume = 0;
        for (const ex of exercises) {
          if (ex.skipped) continue;
          if (ex.modality === 'sets_reps' && ex.weight != null && ex.sets != null && ex.reps != null) {
            totalVolume += ex.weight * ex.sets * ex.reps;
          }
        }
        const updated = await ddb.send(
          new UpdateCommand({
            TableName: WORKOUTS_TABLE,
            Key: key,
            UpdateExpression:
              'SET #status = :status, completedAt = :completedAt, durationMinutes = :durationMinutes, totalVolume = :totalVolume, #exercises = :exercises' +
              (body.notes !== undefined ? ', #notes = :notes' : ''),
            ExpressionAttributeNames: {
              '#status': 'status',
              '#exercises': 'exercises',
              ...(body.notes !== undefined ? { '#notes': 'notes' } : {}),
            },
            ExpressionAttributeValues: {
              ':status': WorkoutStatus.COMPLETED,
              ':completedAt': completedAt,
              ':durationMinutes': durationMinutes,
              ':totalVolume': totalVolume,
              ':exercises': exercises,
              ...(body.notes !== undefined ? { ':notes': body.notes } : {}),
            },
            ReturnValues: 'ALL_NEW',
          })
        );
        const completedWorkout = updated.Attributes as WorkoutInstance;
        try {
          const profileOut = await ddb.send(
            new GetCommand({
              TableName: USERS_TABLE,
              Key: { PK: `USER#${userId}`, SK: PROFILE_SK },
            })
          );
          const profile = profileOut.Item as UserProfile | undefined;
          if (profile) {
            await runFeedFanout(completedWorkout, {
              userId,
              username: profile.username,
              displayName: profile.displayName,
              profilePhoto: profile.profilePhoto,
            }, current.permissionType);
          }
        } catch (feedErr) {
          console.error('Feed fan-out failed', feedErr);
        }
        return res.ok(toResponse(completedWorkout));
      }

      // Partial update (notes, permissionType, exercise fields)
      const updates: string[] = [];
      const names: Record<string, string> = {};
      const values: Record<string, unknown> = {};
      if (body.notes !== undefined) {
        updates.push('#notes = :notes');
        names['#notes'] = 'notes';
        values[':notes'] = body.notes;
      }
      if (body.permissionType !== undefined) {
        updates.push('permissionType = :permissionType');
        values[':permissionType'] = body.permissionType;
      }
      if (body.exercises?.length) {
        const merged = current.exercises.map((ex) => {
          const patch = body.exercises!.find((e) => e.exerciseId === ex.exerciseId);
          return patch ? { ...ex, ...patch } : ex;
        });
        updates.push('#exercises = :exercises');
        names['#exercises'] = 'exercises';
        values[':exercises'] = JSON.parse(JSON.stringify(merged));
      }
      if (updates.length === 0) {
        return res.ok(toResponse(current));
      }
      const updated = await ddb.send(
        new UpdateCommand({
          TableName: WORKOUTS_TABLE,
          Key: key,
          UpdateExpression: `SET ${updates.join(', ')}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ReturnValues: 'ALL_NEW',
        })
      );
      return res.ok(toResponse(updated.Attributes as WorkoutInstance));
    }

    return res.badRequest('Not found');
  } catch (err) {
    return res.serverError(err);
  }
};
