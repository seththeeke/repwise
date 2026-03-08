import type { PostConfirmationTriggerEvent } from 'aws-lambda';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, USERS_TABLE, METRICS_TABLE } from '../../shared/src/ddb';
import type { UserProfile, GlobalMetrics } from '../../shared/src/models';
import { WeightUnit, PermissionType } from '../../shared/src/enums';

export const handler = async (
  event: PostConfirmationTriggerEvent
): Promise<PostConfirmationTriggerEvent> => {
  const userId = event.userName;
  const email = event.request.userAttributes['email'] ?? '';
  const username =
    (event.request.userAttributes['preferred_username'] as string | undefined) ??
    email.split('@')[0];
  const now = new Date().toISOString();

  const profile: UserProfile = {
    PK: `USER#${userId}`,
    SK: 'PROFILE',
    userId,
    email,
    username,
    displayName: username,
    isPrivate: false,
    weightUnit: WeightUnit.LBS,
    defaultPermissionType: PermissionType.FOLLOWERS_ONLY,
    createdAt: now,
    followersCount: 0,
    followingCount: 0,
    streakCount: 0,
  };

  const globalMetrics: GlobalMetrics = {
    PK: `USER#${userId}`,
    SK: 'METRIC#GLOBAL',
    userId,
    totalWorkouts: 0,
    currentStreak: 0,
    longestStreak: 0,
    workoutsLast30: 0,
    workoutsLast90: 0,
    workoutsLast180: 0,
    totalVolumeAllTime: 0,
    completedDates: [],
    updatedAt: now,
  };

  await ddb.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: USERS_TABLE,
            Item: profile as Record<string, unknown>,
            ConditionExpression: 'attribute_not_exists(PK)',
          },
        },
        {
          Put: {
            TableName: METRICS_TABLE,
            Item: globalMetrics as Record<string, unknown>,
            ConditionExpression: 'attribute_not_exists(PK)',
          },
        },
      ],
    })
  );

  return event;
};
