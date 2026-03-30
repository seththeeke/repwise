import type { PostConfirmationTriggerEvent } from 'aws-lambda';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import {
  ddb,
  USERS_TABLE,
  METRICS_TABLE,
  type UserProfile,
  type GlobalMetrics,
  WeightUnit,
  PermissionType,
} from '@repwise/shared';

export const handler = async (
  event: PostConfirmationTriggerEvent
): Promise<PostConfirmationTriggerEvent> => {
  console.log('[cognito-post-confirm] invoked', { userName: event.userName });
  const userId = event.userName;
  const email = event.request.userAttributes['email'] ?? '';
  const rawPreferred = event.request.userAttributes['preferred_username'] as string | undefined;
  const username =
    rawPreferred?.trim() ||
    (email ? email.split('@')[0] : `user_${userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20) || 'member'}`);
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

  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: USERS_TABLE,
              Item: profile as unknown as Record<string, unknown>,
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
          {
            Put: {
              TableName: METRICS_TABLE,
              Item: globalMetrics as unknown as Record<string, unknown>,
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
        ],
      })
    );
    console.log('[cognito-post-confirm] profile and global metrics created', { userId, username });
  } catch (err) {
    console.error('[cognito-post-confirm] TransactWrite failed', { error: err, message: err instanceof Error ? err.message : String(err) });
    throw err;
  }

  return event;
};
