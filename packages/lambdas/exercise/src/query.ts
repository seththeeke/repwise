import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { WORKOUTS_TABLE, ddb, type ExerciseCatalogItem } from '@repwise/shared';

const EXERCISE_PK_PREFIX = 'EXERCISE#';
const METADATA_SK = 'METADATA';

export interface QueryExercisesParams {
  muscleGroup?: string;
  equipment?: string;
  modality?: string;
  search?: string;
}

export async function queryExercises(
  params: QueryExercisesParams
): Promise<ExerciseCatalogItem[]> {
  if (params.muscleGroup) {
    const out = await ddb.send(
      new QueryCommand({
        TableName: WORKOUTS_TABLE,
        IndexName: 'muscleGroup-index',
        KeyConditionExpression: 'muscleGroup = :mg',
        ExpressionAttributeValues: { ':mg': params.muscleGroup },
      })
    );
    return (out.Items ?? []).filter(
      (i) => i.SK === METADATA_SK && String(i.PK).startsWith(EXERCISE_PK_PREFIX)
    ) as ExerciseCatalogItem[];
  }
  if (params.equipment) {
    const out = await ddb.send(
      new QueryCommand({
        TableName: WORKOUTS_TABLE,
        IndexName: 'equipment-index',
        KeyConditionExpression: 'equipmentPrimary = :eq',
        ExpressionAttributeValues: { ':eq': params.equipment },
      })
    );
    return (out.Items ?? []).filter(
      (i) => i.SK === METADATA_SK && String(i.PK).startsWith(EXERCISE_PK_PREFIX)
    ) as ExerciseCatalogItem[];
  }
  const scanOut = await ddb.send(
    new ScanCommand({
      TableName: WORKOUTS_TABLE,
      FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk',
      ExpressionAttributeValues: {
        ':prefix': EXERCISE_PK_PREFIX,
        ':sk': METADATA_SK,
      },
    })
  );
  let items = (scanOut.Items ?? []) as ExerciseCatalogItem[];
  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    items = items.filter((i) => i.name?.toLowerCase().includes(q));
  }
  if (params.modality) {
    items = items.filter((i) => i.modality === params.modality);
  }
  return items;
}
