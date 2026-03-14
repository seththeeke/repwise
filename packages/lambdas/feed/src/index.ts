import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, USERS_TABLE, getUserId, type FeedItem } from '@repwise/shared';
import * as res from '@repwise/shared';

function toFeedItemResponse(item: FeedItem): Record<string, unknown> {
  return {
    eventId: item.eventId,
    eventType: item.eventType,
    actorUserId: item.actorUserId,
    actorUsername: item.actorUsername,
    actorDisplayName: item.actorDisplayName,
    actorProfilePhoto: item.actorProfilePhoto,
    summary: item.summary,
    workoutInstanceId: item.workoutInstanceId,
    isPublic: item.isPublic,
    createdAt: item.createdAt,
  };
}

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const path = event.rawPath ?? event.requestContext.http.path ?? '';
  const queryParams = event.queryStringParameters ?? {};
  const userId = getUserId(event);
  const pk = `FEED#${userId}`;

  if (event.requestContext.http.method !== 'GET' || path !== '/feed') {
    return res.badRequest('Not found');
  }

  try {
    const limit = Math.min(parseInt(queryParams.limit ?? '20', 10) || 20, 50);
    let exclusiveStartKey: Record<string, unknown> | undefined;
    if (queryParams.lastKey) {
      try {
        exclusiveStartKey = JSON.parse(
          Buffer.from(queryParams.lastKey, 'base64').toString('utf8')
        ) as Record<string, unknown>;
      } catch {
        // ignore invalid lastKey
      }
    }

    const out = await ddb.send(
      new QueryCommand({
        TableName: USERS_TABLE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': pk },
        Limit: limit,
        ScanIndexForward: false,
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      })
    );

    const items = (out.Items ?? []) as FeedItem[];
    const nextToken = out.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(out.LastEvaluatedKey)).toString('base64')
      : undefined;

    return res.ok({
      items: items.map(toFeedItemResponse),
      ...(nextToken ? { nextToken } : {}),
    });
  } catch (err) {
    return res.serverError(err);
  }
};
