import { QueryCommand, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, USERS_TABLE } from './ddb';
import type { FeedItem, WorkoutInstance } from './models';
import { FeedEventType, PermissionType } from './enums';

const PROFILE_SK = 'PROFILE';
const FOLLOWER_PREFIX = 'FOLLOWER#';

export interface ActorInfo {
  userId: string;
  username: string;
  displayName: string;
  profilePhoto?: string;
}

/**
 * Write feed items for a completed workout. Call from Workout Lambda on completion.
 * - PRIVATE: only own feed
 * - FOLLOWERS_ONLY / PUBLIC: accepted followers + own feed
 */
export async function runFeedFanout(
  workout: WorkoutInstance,
  actor: ActorInfo,
  permissionType: PermissionType
): Promise<void> {
  const createdAt = workout.completedAt ?? new Date().toISOString();
  const eventId = crypto.randomUUID();
  const sk = `${createdAt}#${eventId}`;

  const baseItem: Omit<FeedItem, 'PK' | 'SK' | 'createdAt'> = {
    eventId,
    eventType: FeedEventType.WORKOUT_COMPLETE,
    actorUserId: actor.userId,
    actorUsername: actor.username,
    actorDisplayName: actor.displayName,
    actorProfilePhoto: actor.profilePhoto,
    summary: 'Completed a workout',
    workoutInstanceId: workout.workoutInstanceId,
    isPublic: permissionType === PermissionType.PUBLIC,
  };

  const ownFeedItem: FeedItem = {
    ...baseItem,
    PK: `FEED#${workout.userId}`,
    SK: sk,
    createdAt,
  };

  const toWrite: FeedItem[] = [ownFeedItem];

  if (permissionType !== PermissionType.PRIVATE) {
    const out = await ddb.send(
      new QueryCommand({
        TableName: USERS_TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':pk': `USER#${workout.userId}`,
          ':sk': FOLLOWER_PREFIX,
          ':status': 'accepted',
        },
      })
    );
    const followers = out.Items ?? [];
    for (const f of followers) {
      const sourceUserId = f.sourceUserId as string;
      if (!sourceUserId) continue;
      toWrite.push({
        ...baseItem,
        PK: `FEED#${sourceUserId}`,
        SK: sk,
        createdAt,
      });
    }
  }

  // BatchWrite supports up to 25 items per request
  for (let i = 0; i < toWrite.length; i += 25) {
    const chunk = toWrite.slice(i, i + 25);
    await ddb.send(
      new BatchWriteCommand({
        RequestItems: {
          [USERS_TABLE]: chunk.map((item) => ({
            PutRequest: {
              Item: item as unknown as Record<string, unknown>,
            },
          })),
        },
      })
    );
  }
}
