import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, USERS_TABLE, getUserId, type Gym, type UserProfile } from '@repwise/shared';
import * as res from '@repwise/shared';

const PROFILE_SK = 'PROFILE';
const GYM_SK_PREFIX = 'GYM#';

function parseBody<T>(body: string | null): T | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

function toGymResponse(g: Gym): Record<string, unknown> {
  return {
    gymId: g.gymId,
    name: g.name,
    equipmentTypes: g.equipmentTypes ?? [],
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

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.rawPath ?? event.requestContext.http.path ?? '';
  const pathParams = event.pathParameters ?? {};
  const gymIdParam = pathParams.gymId;
  const userId = getUserId(event);
  const pk = `USER#${userId}`;
  console.log('[gyms] request', { method, path, userId, gymId: gymIdParam });

  try {
    // GET /users/me/gyms — list gyms
    if (method === 'GET' && path === '/users/me/gyms') {
      const profile = await getProfile(userId);
      const out = await ddb.send(
        new QueryCommand({
          TableName: USERS_TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: { ':pk': pk, ':sk': GYM_SK_PREFIX },
        })
      );
      const gyms = (out.Items ?? []) as Gym[];
      const defaultGymId = profile?.defaultGymId;
      return res.ok({
        gyms: gyms.map(toGymResponse),
        defaultGymId: defaultGymId ?? null,
      });
    }

    // POST /users/me/gyms — create gym
    if (method === 'POST' && path === '/users/me/gyms') {
      const body = parseBody<{ name?: string; equipmentTypes?: string[] }>(event.body ?? null);
      if (!body?.name || !Array.isArray(body.equipmentTypes)) {
        return res.badRequest('name and equipmentTypes (array) required');
      }
      const gymId = crypto.randomUUID();
      const sk = `${GYM_SK_PREFIX}${gymId}`;
      const gym: Gym = {
        PK: pk,
        SK: sk,
        gymId,
        userId,
        name: String(body.name).trim(),
        equipmentTypes: body.equipmentTypes.filter((e) => typeof e === 'string'),
      };
      await ddb.send(
        new PutCommand({
          TableName: USERS_TABLE,
          Item: gym as unknown as Record<string, unknown>,
        })
      );
      return res.created(toGymResponse(gym));
    }

    // PATCH /users/me/gyms/{gymId} — update gym
    if (method === 'PATCH' && gymIdParam) {
      const body = parseBody<{ name?: string; equipmentTypes?: string[] }>(event.body ?? null);
      if (!body || (body.name === undefined && !Array.isArray(body.equipmentTypes))) {
        return res.badRequest('Provide name and/or equipmentTypes to update');
      }
      const sk = `${GYM_SK_PREFIX}${gymIdParam}`;
      const getOut = await ddb.send(
        new GetCommand({ TableName: USERS_TABLE, Key: { PK: pk, SK: sk } })
      );
      const existing = getOut.Item as Gym | undefined;
      if (!existing) return res.notFound('Gym');
      const updates: string[] = [];
      const names: Record<string, string> = {};
      const values: Record<string, unknown> = {};
      if (body.name !== undefined) {
        updates.push('#name = :name');
        names['#name'] = 'name';
        values[':name'] = String(body.name).trim();
      }
      if (Array.isArray(body.equipmentTypes)) {
        updates.push('equipmentTypes = :equipmentTypes');
        values[':equipmentTypes'] = body.equipmentTypes.filter((e) => typeof e === 'string');
      }
      if (updates.length === 0) {
        return res.ok(toGymResponse(existing));
      }
      await ddb.send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { PK: pk, SK: sk },
          UpdateExpression: `SET ${updates.join(', ')}`,
          ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
          ExpressionAttributeValues: values,
        })
      );
      const updated = { ...existing, ...(body.name !== undefined && { name: String(body.name).trim() }), ...(Array.isArray(body.equipmentTypes) && { equipmentTypes: body.equipmentTypes }) };
      return res.ok(toGymResponse(updated as Gym));
    }

    // DELETE /users/me/gyms/{gymId}
    if (method === 'DELETE' && gymIdParam) {
      const sk = `${GYM_SK_PREFIX}${gymIdParam}`;
      const getOut = await ddb.send(
        new GetCommand({ TableName: USERS_TABLE, Key: { PK: pk, SK: sk } })
      );
      if (!getOut.Item) return res.notFound('Gym');
      const profile = await getProfile(userId);
      if (profile?.defaultGymId === gymIdParam) {
        await ddb.send(
          new UpdateCommand({
            TableName: USERS_TABLE,
            Key: { PK: pk, SK: PROFILE_SK },
            UpdateExpression: 'REMOVE #dg',
            ExpressionAttributeNames: { '#dg': 'defaultGymId' },
          })
        );
      }
      await ddb.send(
        new DeleteCommand({ TableName: USERS_TABLE, Key: { PK: pk, SK: sk } })
      );
      return res.noContent();
    }

    console.log('[gyms] no route matched', { method, path });
    return res.badRequest('Not found');
  } catch (err) {
    console.error('[gyms] handler error', { error: err, message: err instanceof Error ? err.message : String(err) });
    return res.serverError(err);
  }
};
