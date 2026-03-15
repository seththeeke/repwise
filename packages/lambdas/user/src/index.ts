import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, USERS_TABLE, getUserId, type UserProfile } from '@repwise/shared';
import * as res from '@repwise/shared';

const PROFILE_SK = 'PROFILE';

function toMeProfile(p: UserProfile): Record<string, unknown> {
  return {
    userId: p.userId,
    email: p.email,
    username: p.username,
    displayName: p.displayName,
    profilePhoto: p.profilePhoto,
    bio: p.bio,
    isPrivate: p.isPrivate,
    weightUnit: p.weightUnit,
    defaultPermissionType: p.defaultPermissionType,
    defaultGymId: p.defaultGymId,
    onboardingCompletedAt: p.onboardingCompletedAt,
    followersCount: p.followersCount,
    followingCount: p.followingCount,
    streakCount: p.streakCount,
    lastWorkoutDate: p.lastWorkoutDate,
    createdAt: p.createdAt,
  };
}

function toPublicProfile(p: UserProfile): Record<string, unknown> {
  return {
    userId: p.userId,
    username: p.username,
    displayName: p.displayName,
    profilePhoto: p.profilePhoto,
    bio: p.bio,
    weightUnit: p.weightUnit,
    followersCount: p.followersCount,
    followingCount: p.followingCount,
    streakCount: p.streakCount,
    lastWorkoutDate: p.lastWorkoutDate,
    createdAt: p.createdAt,
  };
}

async function getProfile(userId: string): Promise<UserProfile | null> {
  const out = await ddb.send(
    new GetCommand({
      TableName: USERS_TABLE,
      Key: { PK: `USER#${userId}`, SK: PROFILE_SK },
    })
  );
  return (out.Item as UserProfile) ?? null;
}

async function getProfileByUsername(username: string): Promise<UserProfile | null> {
  const out = await ddb.send(
    new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'username-index',
      KeyConditionExpression: 'username = :u',
      ExpressionAttributeValues: { ':u': username },
    })
  );
  const item = out.Items?.[0];
  if (!item || item.SK !== PROFILE_SK) return null;
  return item as unknown as UserProfile;
}

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.rawPath ?? event.requestContext.http.path ?? '';
  const pathParams = event.pathParameters ?? {};
  const usernameParam = pathParams.username;
  console.log('[user] request', { method, path, username: usernameParam });

  try {
    // GET /users/me
    if (method === 'GET' && path === '/users/me') {
      const userId = getUserId(event);
      const profile = await getProfile(userId);
      if (!profile) return res.notFound('Profile');
      return res.ok(toMeProfile(profile));
    }

    // PATCH /users/me
    if (method === 'PATCH' && path === '/users/me') {
      const userId = getUserId(event);
      let body: Record<string, unknown> = {};
      try {
        body = event.body ? JSON.parse(event.body) : {};
      } catch {
        return res.badRequest('Invalid JSON body');
      }
      const allowed = ['displayName', 'bio', 'weightUnit', 'profilePhoto', 'defaultGymId', 'onboardingCompletedAt'];
      const updates: Record<string, unknown> = {};
      for (const k of allowed) {
        if (body[k] !== undefined) updates[k] = body[k];
      }
      if (Object.keys(updates).length === 0) {
        const profile = await getProfile(userId);
        if (!profile) return res.notFound('Profile');
        return res.ok(toMeProfile(profile));
      }
      const setParts = Object.keys(updates).map((k) => `#${k} = :${k}`);
      const names: Record<string, string> = {};
      const values: Record<string, unknown> = {};
      for (const k of Object.keys(updates)) {
        names[`#${k}`] = k;
        values[`:${k}`] = updates[k];
      }
      await ddb.send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { PK: `USER#${userId}`, SK: PROFILE_SK },
          UpdateExpression: `SET ${setParts.join(', ')}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
        })
      );
      const profile = await getProfile(userId);
      return res.ok(toMeProfile(profile!));
    }

    // GET /users/{username} — public, no auth required
    if (method === 'GET' && usernameParam) {
      const profile = await getProfileByUsername(usernameParam);
      if (!profile) return res.notFound('User');
      return res.ok(toPublicProfile(profile));
    }

    console.log('[user] no route matched', { method, path });
    return res.badRequest('Not found');
  } catch (err) {
    console.error('[user] handler error', { error: err, message: err instanceof Error ? err.message : String(err) });
    return res.serverError(err);
  }
};
