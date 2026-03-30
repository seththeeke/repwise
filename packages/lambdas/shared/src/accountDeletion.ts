import {
  BatchWriteCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { ddb } from './ddb';

const BATCH = 25;
const FOLLOWER_PREFIX = 'FOLLOWER#';

async function batchDeleteKeys(
  tableName: string,
  keys: { PK: string; SK: string }[]
): Promise<void> {
  const valid = keys.filter((k) => k.PK && k.SK);
  for (let i = 0; i < valid.length; i += BATCH) {
    const chunk = valid.slice(i, i + BATCH);
    await ddb.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: chunk.map((k) => ({
            DeleteRequest: { Key: { PK: k.PK, SK: k.SK } },
          })),
        },
      })
    );
  }
}

/** Deletes every item whose partition key equals `pk` (full partition wipe). */
export async function deleteAllItemsWithPk(
  tableName: string,
  pk: string
): Promise<void> {
  let lastKey: Record<string, unknown> | undefined;
  do {
    const out = await ddb.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': pk },
        ExclusiveStartKey: lastKey,
      })
    );
    const keys = (out.Items ?? []).map((i) => ({
      PK: i.PK as string,
      SK: i.SK as string,
    }));
    await batchDeleteKeys(tableName, keys);
    lastKey = out.LastEvaluatedKey;
  } while (lastKey);
}

/**
 * Removes feed events authored by `actorUserId` from each follower's `FEED#` partition.
 * Uses `USER#actorUserId` rows with SK `FOLLOWER#*` (accepted followers list on the actor).
 */
export async function removeFeedEventsFromFollowersForActor(
  usersTable: string,
  actorUserId: string
): Promise<void> {
  const userPk = `USER#${actorUserId}`;
  let lastKey: Record<string, unknown> | undefined;
  const followerIds = new Set<string>();
  do {
    const out = await ddb.send(
      new QueryCommand({
        TableName: usersTable,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': userPk,
          ':sk': FOLLOWER_PREFIX,
        },
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of out.Items ?? []) {
      const sid = item.sourceUserId as string | undefined;
      if (sid) followerIds.add(sid);
    }
    lastKey = out.LastEvaluatedKey;
  } while (lastKey);

  for (const followerId of followerIds) {
    await deleteFeedItemsWhereActor(usersTable, followerId, actorUserId);
  }
}

async function deleteFeedItemsWhereActor(
  usersTable: string,
  feedOwnerUserId: string,
  actorUserId: string
): Promise<void> {
  const pk = `FEED#${feedOwnerUserId}`;
  let lastKey: Record<string, unknown> | undefined;
  do {
    const out = await ddb.send(
      new QueryCommand({
        TableName: usersTable,
        KeyConditionExpression: 'PK = :pk',
        FilterExpression: 'actorUserId = :aid',
        ExpressionAttributeValues: {
          ':pk': pk,
          ':aid': actorUserId,
        },
        ExclusiveStartKey: lastKey,
      })
    );
    const keys = (out.Items ?? []).map((i) => ({
      PK: i.PK as string,
      SK: i.SK as string,
    }));
    await batchDeleteKeys(usersTable, keys);
    lastKey = out.LastEvaluatedKey;
  } while (lastKey);
}

/**
 * Removes `FOLLOWER#*` edges on other users' partitions where this user was the follower
 * (`sourceUserId` matches). Uses a table scan (rare operation; acceptable for small pools).
 */
export async function removeFollowerEdgesWhereUserWasFollower(
  usersTable: string,
  deletedFollowerUserId: string
): Promise<void> {
  let lastKey: Record<string, unknown> | undefined;
  do {
    const out = await ddb.send(
      new ScanCommand({
        TableName: usersTable,
        FilterExpression: 'begins_with(SK, :fp) AND sourceUserId = :uid',
        ExpressionAttributeValues: {
          ':fp': FOLLOWER_PREFIX,
          ':uid': deletedFollowerUserId,
        },
        ExclusiveStartKey: lastKey,
      })
    );
    const keys = (out.Items ?? []).map((i) => ({
      PK: i.PK as string,
      SK: i.SK as string,
    }));
    await batchDeleteKeys(usersTable, keys);
    lastKey = out.LastEvaluatedKey;
  } while (lastKey);
}

export interface DeleteUserDataTables {
  usersTable: string;
  workoutsTable: string;
  metricsTable: string;
  builderSessionsTable: string;
}

/** Deletes app data for a user across DynamoDB tables (not Cognito). */
export async function deleteAllUserAppData(
  userId: string,
  tables: DeleteUserDataTables
): Promise<void> {
  const { usersTable, workoutsTable, metricsTable, builderSessionsTable } =
    tables;

  await removeFeedEventsFromFollowersForActor(usersTable, userId);
  await removeFollowerEdgesWhereUserWasFollower(usersTable, userId);

  const userPk = `USER#${userId}`;
  const feedPk = `FEED#${userId}`;

  await deleteAllItemsWithPk(usersTable, userPk);
  await deleteAllItemsWithPk(usersTable, feedPk);
  await deleteAllItemsWithPk(workoutsTable, userPk);
  await deleteAllItemsWithPk(metricsTable, userPk);
  await deleteAllItemsWithPk(builderSessionsTable, userPk);
}
