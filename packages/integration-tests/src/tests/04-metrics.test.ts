import { describe, it, expect, beforeAll } from 'vitest';
import { getTestToken } from '../helpers/auth';
import { makeClient } from '../helpers/client';

describe('Metrics', () => {
  let client: ReturnType<typeof makeClient>;

  beforeAll(async () => {
    client = makeClient(await getTestToken());
  });

  it('GET /metrics/me/global returns valid global metrics', async () => {
    const res = await client.get('/metrics/me/global');
    expect(res.status).toBe(200);
    expect(res.data.totalWorkouts).toBeGreaterThanOrEqual(1);
    expect(typeof res.data.currentStreak).toBe('number');
    expect(Array.isArray(res.data.completedDates)).toBe(true);
  });

  it('GET /metrics/me/exercises returns a list after completed workout', async () => {
    const res = await client.get('/metrics/me/exercises');
    expect(res.status).toBe(200);
    expect(res.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /metrics/me/exercises/:id returns exercise trend data', async () => {
    const list = await client.get('/metrics/me/exercises');
    const exerciseId = list.data[0].exerciseId;
    const res = await client.get(`/metrics/me/exercises/${exerciseId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.trendData)).toBe(true);
    expect(Array.isArray(res.data.personalRecordHistory)).toBe(true);
  });
});
