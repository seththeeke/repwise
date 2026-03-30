import { describe, it, expect, beforeAll } from 'vitest';
import { getDeleteTestToken } from '../helpers/auth';
import { makeClient } from '../helpers/client';

/**
 * Deletes the **dedicated** delete-test Cognito user (`TEST_DELETE_USER_*`).
 * Skipped unless `TEST_DELETE_USER_EMAIL` and `TEST_DELETE_USER_PASSWORD` are set.
 * Do not point these at the default integration user used by other suites.
 */
describe.skipIf(
  !process.env.API_BASE_URL ||
    !process.env.TEST_DELETE_USER_EMAIL ||
    !process.env.TEST_DELETE_USER_PASSWORD
)('Account deletion (destructive)', () => {
  let client: ReturnType<typeof makeClient>;

  beforeAll(async () => {
    client = makeClient(await getDeleteTestToken());
  });

  it('DELETE /users/me returns 204', async () => {
    const res = await client.delete('/users/me');
    expect(res.status).toBe(204);
  });
});
