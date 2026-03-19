import { describe, it, expect, beforeAll } from 'vitest';
import { getTestToken, getTestToken2 } from '../helpers/auth';
import { makeClient } from '../helpers/client';

describe.skipIf(!process.env.API_BASE_URL)('Builder AI config admin endpoint', () => {
  let adminClient: ReturnType<typeof makeClient>;
  let nonAdminClient: ReturnType<typeof makeClient> | null = null;

  beforeAll(async () => {
    adminClient = makeClient(await getTestToken());
    if (process.env.TEST_USER_2_EMAIL && process.env.TEST_USER_2_PASSWORD) {
      nonAdminClient = makeClient(await getTestToken2());
    }
  });

  it('GET /admin/builder-ai-config returns config for TEST_USER_EMAIL', async () => {
    const res = await adminClient.get('/admin/builder-ai-config');
    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({
      bedrockModelId: expect.any(String),
      intentPromptTemplate: expect.any(String),
      selectExercisesPromptTemplate: expect.any(String),
      regeneratePromptTemplate: expect.any(String),
    });
  });

  it('GET /admin/builder-ai-config is forbidden for non-admin', async () => {
    if (!nonAdminClient) return;
    const res = await nonAdminClient.get('/admin/builder-ai-config');
    expect(res.status).toBe(403);
  });
});

