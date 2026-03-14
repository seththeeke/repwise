import { describe, it, expect, beforeAll } from 'vitest';
import { getTestToken } from '../helpers/auth';
import { makeClient } from '../helpers/client';

describe.skipIf(!process.env.API_BASE_URL)('Profile', () => {
  let client: ReturnType<typeof makeClient>;

  beforeAll(async () => {
    client = makeClient(await getTestToken());
  });

  it('GET /users/me returns a valid profile', async () => {
    const res = await client.get('/users/me');
    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({
      userId: expect.any(String),
      email: process.env.TEST_USER_EMAIL,
      username: expect.any(String),
      weightUnit: expect.stringMatching(/^(LBS|KG)$/),
    });
  });

  it('PATCH /users/me updates displayName', async () => {
    const res = await client.patch('/users/me', { displayName: 'Test Runner' });
    expect(res.status).toBe(200);
    expect(res.data.displayName).toBe('Test Runner');
  });

  it('GET /users/:username returns public profile', async () => {
    const me = await client.get('/users/me');
    const res = await client.get(`/users/${me.data.username}`);
    expect(res.status).toBe(200);
    expect(res.data.userId).toBe(me.data.userId);
  });

  it('GET /users/:username returns 404 for unknown username', async () => {
    const res = await client.get('/users/this_user_does_not_exist_xyz');
    expect(res.status).toBe(404);
  });
});
