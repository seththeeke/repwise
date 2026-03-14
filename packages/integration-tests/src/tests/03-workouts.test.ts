import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestToken } from '../helpers/auth';
import { makeClient } from '../helpers/client';
import { TeardownRegistry } from '../helpers/teardown';

describe.skipIf(!process.env.API_BASE_URL)('Workout Instances', () => {
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

  afterAll(async () => teardown.cleanup());

  it('POST /workout-instances creates an in-progress workout', async () => {
    const res = await client.post('/workout-instances', {
      source: 'manual',
      permissionType: 'PRIVATE',
      exercises: [
        {
          exerciseId,
          exerciseName: 'Test Exercise',
          modality: 'sets_reps',
          sets: 3,
          reps: 10,
          skipped: false,
          orderIndex: 0,
        },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.data.status).toBe('in_progress');
    workoutId = res.data.workoutInstanceId;
    teardown.register('workout', workoutId);
  });

  it('GET /workout-instances/:id returns the created workout', async () => {
    const res = await client.get(`/workout-instances/${workoutId}`);
    expect(res.status).toBe(200);
    expect(res.data.workoutInstanceId).toBe(workoutId);
    expect(res.data.exercises).toHaveLength(1);
  });

  it('PATCH /workout-instances/:id updates exercise weight', async () => {
    const res = await client.patch(`/workout-instances/${workoutId}`, {
      exercises: [{ exerciseId, weight: 135, weightUnit: 'LBS' }],
    });
    expect(res.status).toBe(200);
    const updated = res.data.exercises.find(
      (e: { exerciseId: string }) => e.exerciseId === exerciseId
    );
    expect(updated.weight).toBe(135);
  });

  it('PATCH /workout-instances/:id completes the workout', async () => {
    const res = await client.patch(`/workout-instances/${workoutId}`, {
      status: 'completed',
    });
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('completed');
    expect(res.data.completedAt).toBeTruthy();
  });

  it('PATCH /workout-instances/:id rejects mutation of a completed workout', async () => {
    const res = await client.patch(`/workout-instances/${workoutId}`, {
      status: 'cancelled',
    });
    expect(res.status).toBe(400);
  });

  it('GET /workout-instances returns history list', async () => {
    const res = await client.get('/workout-instances', {
      params: { status: 'completed' },
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.items)).toBe(true);
  });
});
