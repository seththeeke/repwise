import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { WORKOUTS_TABLE, ddb } from './ddb';
import type { ExerciseCatalogItem } from './models';

const EXERCISE_PK_PREFIX = 'EXERCISE#';
const METADATA_SK = 'METADATA';

export interface QueryCatalogParams {
  muscleGroup?: string;
  muscleGroups?: string[];
  search?: string;
  modality?: string;
  /** Filter to exercises that have at least one of these equipment types in their equipment array. */
  equipmentTypes?: string[];
  limit?: number;
}

function filterByEquipment(
  items: ExerciseCatalogItem[],
  equipmentTypes?: string[]
): ExerciseCatalogItem[] {
  if (!equipmentTypes?.length) return items;
  const set = new Set(equipmentTypes.map((e) => e.toLowerCase()));
  return items.filter((i) => {
    const eq = (i.equipment ?? []) as string[];
    return eq.some((e) => set.has(String(e).toLowerCase()));
  });
}

/**
 * Query exercise catalog by muscle group(s) or full scan with optional filters.
 * Used by AI Lambda for candidate set; mirrors exercise Lambda query logic.
 */
export async function queryCatalog(
  params: QueryCatalogParams
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
    let items = (out.Items ?? []).filter(
      (i) => i.SK === METADATA_SK && String(i.PK).startsWith(EXERCISE_PK_PREFIX)
    ) as ExerciseCatalogItem[];
    items = filterByEquipment(items, params.equipmentTypes);
    return items.slice(0, params.limit ?? 100);
  }
  if (params.muscleGroups?.length) {
    const all: ExerciseCatalogItem[] = [];
    for (const mg of params.muscleGroups) {
      const out = await ddb.send(
        new QueryCommand({
          TableName: WORKOUTS_TABLE,
          IndexName: 'muscleGroup-index',
          KeyConditionExpression: 'muscleGroup = :mg',
          ExpressionAttributeValues: { ':mg': mg },
        })
      );
      const items = (out.Items ?? []).filter(
        (i) =>
          i.SK === METADATA_SK && String(i.PK).startsWith(EXERCISE_PK_PREFIX)
      ) as ExerciseCatalogItem[];
      for (const item of items) {
        if (!all.some((e) => e.exerciseId === item.exerciseId)) all.push(item);
      }
    }
    let filtered = filterByEquipment(all, params.equipmentTypes);
    return filtered.slice(0, params.limit ?? 100);
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
  items = filterByEquipment(items, params.equipmentTypes);
  const limit = params.limit ?? 100;
  return items.slice(0, limit);
}
