import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, WORKOUTS_TABLE, type ExerciseCatalogItem } from '@repwise/shared';
import { queryExercises } from './query';
import * as res from '@repwise/shared';

const EXERCISE_PK_PREFIX = 'EXERCISE#';
const METADATA_SK = 'METADATA';

function toResponseItem(item: ExerciseCatalogItem): Record<string, unknown> {
  return {
    exerciseId: item.exerciseId,
    name: item.name,
    muscleGroups: item.muscleGroups,
    muscleGroup: item.muscleGroup,
    equipment: item.equipment,
    equipmentPrimary: item.equipmentPrimary,
    modality: item.modality,
    defaultSets: item.defaultSets,
    defaultReps: item.defaultReps,
    defaultDurationSeconds: item.defaultDurationSeconds,
    difficulty: item.difficulty,
    instructions: item.instructions,
    isActive: item.isActive,
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

  try {
    // GET /exercises
    if (method === 'GET' && path === '/exercises') {
      const muscleGroup = queryParams.muscleGroup ?? undefined;
      const equipment = queryParams.equipment ?? undefined;
      const modality = queryParams.modality ?? undefined;
      const search = queryParams.search ?? undefined;
      const items = await queryExercises({ muscleGroup, equipment, modality, search });
      return res.ok(items.map(toResponseItem));
    }

    // GET /exercises/{exerciseId}
    if (method === 'GET' && exerciseIdParam) {
      const out = await ddb.send(
        new GetCommand({
          TableName: WORKOUTS_TABLE,
          Key: { PK: `${EXERCISE_PK_PREFIX}${exerciseIdParam}`, SK: METADATA_SK },
        })
      );
      const item = out.Item as ExerciseCatalogItem | undefined;
      if (!item) return res.notFound('Exercise');
      return res.ok(toResponseItem(item));
    }

    return res.badRequest('Not found');
  } catch (err) {
    return res.serverError(err);
  }
};
