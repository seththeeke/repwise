import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import {
  USERS_TABLE,
  WORKOUTS_TABLE,
  METRICS_TABLE,
  BUILDER_SESSIONS_TABLE,
  getUserId,
  deleteAllUserAppData,
} from '@repwise/shared';
import * as res from '@repwise/shared';

const cognitoClient = new CognitoIdentityProviderClient({});

function isUserNotFound(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name: string }).name === 'UserNotFoundException'
  );
}

/**
 * DELETE /users/me — remove all app data for the JWT subject, then delete the Cognito user.
 * Isolated from UserLambda so profile routes do not carry delete permissions.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.rawPath ?? event.requestContext.http.path ?? '';
  console.log('[cleanup-user-data] request', { method, path });

  try {
    if (method === 'DELETE' && path === '/users/me') {
      const userId = getUserId(event);
      const poolId = process.env.USER_POOL_ID;
      if (!poolId) {
        console.error('[cleanup-user-data] USER_POOL_ID not configured');
        return res.serverError(new Error('USER_POOL_ID missing'));
      }
      await deleteAllUserAppData(userId, {
        usersTable: USERS_TABLE,
        workoutsTable: WORKOUTS_TABLE,
        metricsTable: METRICS_TABLE,
        builderSessionsTable: BUILDER_SESSIONS_TABLE,
      });
      try {
        await cognitoClient.send(
          new AdminDeleteUserCommand({
            UserPoolId: poolId,
            Username: userId,
          })
        );
      } catch (err) {
        if (!isUserNotFound(err)) throw err;
      }
      return res.noContent();
    }

    console.log('[cleanup-user-data] no route matched', { method, path });
    return res.badRequest('Not found');
  } catch (err) {
    console.error('[cleanup-user-data] handler error', {
      error: err,
      message: err instanceof Error ? err.message : String(err),
    });
    return res.serverError(err);
  }
};
