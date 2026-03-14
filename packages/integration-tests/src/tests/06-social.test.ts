import { describe, it, expect, beforeAll } from 'vitest';
import { getTestToken, getTestToken2 } from '../helpers/auth';
import { makeClient } from '../helpers/client';

// Skip when second test user is not configured (TEST_USER_2_EMAIL, TEST_USER_2_PASSWORD).
describe.skipIf(
  !process.env.API_BASE_URL ||
  !process.env.TEST_USER_2_EMAIL ||
  !process.env.TEST_USER_2_PASSWORD
)('Social', () => {
  let client1: ReturnType<typeof makeClient>;
  let client2: ReturnType<typeof makeClient>;
  let user2Id: string;

  beforeAll(async () => {
    const [token1, token2] = await Promise.all([
      getTestToken(),
      getTestToken2(),
    ]);
    client1 = makeClient(token1);
    client2 = makeClient(token2);
    const user2 = await client2.get('/users/me');
    user2Id = user2.data.userId;
  });

  it('POST /users/:id/follow creates a follow relationship', async () => {
    const res = await client1.post(`/users/${user2Id}/follow`);
    expect(res.status).toBe(200);
  });

  it('GET /users/me/following reflects the new follow', async () => {
    const res = await client1.get('/users/me/following');
    expect(res.status).toBe(200);
    const found = res.data.find((u: { userId: string }) => u.userId === user2Id);
    expect(found).toBeDefined();
  });

  it('DELETE /users/:id/follow removes the relationship', async () => {
    const res = await client1.delete(`/users/${user2Id}/follow`);
    expect(res.status).toBe(200);
    const following = await client1.get('/users/me/following');
    const found = following.data.find(
      (u: { userId: string }) => u.userId === user2Id
    );
    expect(found).toBeUndefined();
  });
});
