import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestToken } from '../helpers/auth';
import { makeClient } from '../helpers/client';
import { TeardownRegistry } from '../helpers/teardown';

describe.skipIf(!process.env.API_BASE_URL)('Feed', () => {
  let client: ReturnType<typeof makeClient>;
  let teardown: TeardownRegistry;
  let workoutId: string;
  let exerciseId: string;

  beforeAll(async () => {
    client = makeClient(await getTestToken());
    teardown = new TeardownRegistry(client);

    const exercises = await client.get('/exercises');
    exerciseId = exercises.data[0].exerciseId;
  });

  afterAll(async () => { if (teardown) await teardown.cleanup(); });

  it('GET /feed returns empty or existing items', async () => {
    const res = await client.get('/feed');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.items)).toBe(true);
  });

  it('GET /feed returns workout_complete after completing a workout', async () => {
    const create = await client.post('/workout-instances', {
      source: 'manual',
      permissionType: 'PUBLIC',
      exercises: [
        {
          exerciseId,
          exerciseName: 'Feed Test Exercise',
          modality: 'sets_reps',
          sets: 2,
          reps: 5,
          skipped: false,
          orderIndex: 0,
        },
      ],
    });
    expect(create.status).toBe(201);
    workoutId = create.data.workoutInstanceId;
    teardown.register('workout', workoutId);

    await client.patch(`/workout-instances/${workoutId}`, {
      exercises: [{ exerciseId, weight: 95, weightUnit: 'LBS' }],
    });
    const complete = await client.patch(`/workout-instances/${workoutId}`, {
      status: 'completed',
    });
    expect(complete.status).toBe(200);

    // Allow DynamoDB eventual consistency for feed fan-out write
    await new Promise((r) => setTimeout(r, 2000));

    const feedRes = await client.get('/feed');
    expect(feedRes.status).toBe(200);
    const items = feedRes.data.items ?? [];
    const workoutEvent = items.find(
      (e: { eventType: string; workoutInstanceId?: string }) =>
        e.eventType === 'workout_complete' && e.workoutInstanceId === workoutId
    );
    expect(workoutEvent).toBeDefined();
    expect(workoutEvent.summary).toBeTruthy();
  });
});
