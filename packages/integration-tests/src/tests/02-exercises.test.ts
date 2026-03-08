import { describe, it, expect, beforeAll } from 'vitest';
import { getTestToken } from '../helpers/auth';
import { makeClient } from '../helpers/client';

describe('Exercise Catalog', () => {
  let client: ReturnType<typeof makeClient>;

  beforeAll(async () => {
    client = makeClient(await getTestToken());
  });

  it('GET /exercises returns a non-empty catalog', async () => {
    const res = await client.get('/exercises');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBeGreaterThan(0);
  });

  it('GET /exercises?muscleGroup=chest returns only chest exercises', async () => {
    const res = await client.get('/exercises', {
      params: { muscleGroup: 'chest' },
    });
    expect(res.status).toBe(200);
    res.data.forEach((ex: { muscleGroups: string[] }) => {
      expect(ex.muscleGroups).toContain('chest');
    });
  });

  it('GET /exercises/:id returns exercise detail', async () => {
    const list = await client.get('/exercises');
    const firstId = list.data[0].exerciseId;
    const res = await client.get(`/exercises/${firstId}`);
    expect(res.status).toBe(200);
    expect(res.data.exerciseId).toBe(firstId);
    expect(res.data.instructions).toBeTruthy();
  });
});
