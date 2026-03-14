import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestToken } from '../helpers/auth';
import { makeClient } from '../helpers/client';
import { TeardownRegistry } from '../helpers/teardown';

// Skip until Goals Lambda and /goals/me/* routes are implemented.
describe.skipIf(true)('Goals', () => {
  let client: ReturnType<typeof makeClient>;
  let teardown: TeardownRegistry;
  let goalId: string;

  beforeAll(async () => {
    client = makeClient(await getTestToken());
    teardown = new TeardownRegistry(client);
  });

  afterAll(async () => teardown.cleanup());

  it('POST /goals/me creates a goal', async () => {
    const res = await client.post('/goals/me', {
      type: 'total_workouts',
      title: 'Complete 10 Workouts',
      timeframe: 'monthly',
      targetValue: 10,
      unit: 'workouts',
    });
    expect(res.status).toBe(201);
    expect(res.data.status).toBe('active');
    expect(res.data.currentValue).toBeGreaterThanOrEqual(0);
    goalId = res.data.goalId;
    teardown.register('goal', goalId);
  });

  it('GET /goals/me returns the created goal', async () => {
    const res = await client.get('/goals/me', { params: { status: 'active' } });
    expect(res.status).toBe(200);
    const found = res.data.find((g: { goalId: string }) => g.goalId === goalId);
    expect(found).toBeDefined();
  });

  it('DELETE /goals/me/:id removes the goal', async () => {
    const res = await client.delete(`/goals/me/${goalId}`);
    expect(res.status).toBe(204);
    const list = await client.get('/goals/me');
    const found = list.data.find((g: { goalId: string }) => g.goalId === goalId);
    expect(found).toBeUndefined();
    teardown.remove(goalId);
  });
});
