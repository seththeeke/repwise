# Repwise — Integration Test Spec
> Vitest-based integration tests against the deployed backend. Pair with BACKEND_SPEC.md for full context on each endpoint being tested.

---

## Stack & Location

| Item | Choice |
|---|---|
| Test framework | Vitest |
| HTTP client | Axios (already in monorepo) |
| Location | `packages/integration-tests/` |
| Runs against | Deployed dev environment |
| Test user | Permanent user, CDK-provisioned |
| CI | Local only for now |

---

## Monorepo Setup

```bash
mkdir packages/integration-tests && cd packages/integration-tests
pnpm init
pnpm add -D vitest @types/node axios
pnpm add amazon-cognito-identity-js
```

**`packages/integration-tests/package.json`**
```json
{
  "name": "@repwise/integration-tests",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^1.0.0"
  }
}
```

**`packages/integration-tests/vitest.config.ts`**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30_000,      // Lambda cold starts can be slow
    hookTimeout: 30_000,
    sequence: { sequential: true }, // Run test files sequentially — avoid race conditions on shared test user data
    reporters: ['verbose'],
  },
});
```

---

## Environment Variables

**`packages/integration-tests/.env.test`** — never commit this file.

```bash
API_BASE_URL=https://api.yourapp.com/v1
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
TEST_USER_EMAIL=testuser@repwise-test.com
TEST_USER_PASSWORD=TestPass123!
TEST_USER_2_EMAIL=testuser2@repwise-test.com
TEST_USER_2_PASSWORD=TestPass123!
```

Add to root `.gitignore`:
```
packages/integration-tests/.env.test
```

---

## CDK: Provision Test Users

Add to `packages/cdk/lib/repwise-stack.ts`. Test users are created once at deploy time and never torn down.

```typescript
// Only create test users in non-production environments
if (this.node.tryGetContext('env') !== 'prod') {
  new cognito.CfnUserPoolUser(this, 'TestUser1', {
    userPoolId: auth.userPool.userPoolId,
    username: 'testuser@repwise-test.com',
    temporaryPassword: process.env.TEST_USER_PASSWORD,
    messageAction: 'SUPPRESS',  // Don't send welcome email
    userAttributes: [
      { name: 'email', value: 'testuser@repwise-test.com' },
      { name: 'email_verified', value: 'true' },
    ],
  });

  new cognito.CfnUserPoolUser(this, 'TestUser2', {
    userPoolId: auth.userPool.userPoolId,
    username: 'testuser2@repwise-test.com',
    temporaryPassword: process.env.TEST_USER_PASSWORD,
    messageAction: 'SUPPRESS',
    userAttributes: [
      { name: 'email', value: 'testuser2@repwise-test.com' },
      { name: 'email_verified', value: 'true' },
    ],
  });
}
```

> Two test users are needed for social tests (follow/feed). Both are provisioned by CDK so there is no manual setup required after a fresh deploy.

---

## Shared Test Utilities

**`src/helpers/auth.ts`**
```typescript
import {
  CognitoUserPool, CognitoUser, AuthenticationDetails,
} from 'amazon-cognito-identity-js';
import 'dotenv/config';

const pool = new CognitoUserPool({
  UserPoolId: process.env.COGNITO_USER_POOL_ID!,
  ClientId: process.env.COGNITO_CLIENT_ID!,
});

// Token is cached per test run — Cognito is not called on every test
const tokenCache = new Map<string, string>();

export const getToken = (email: string, password: string): Promise<string> => {
  if (tokenCache.has(email)) return Promise.resolve(tokenCache.get(email)!);

  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: pool });
    user.authenticateUser(
      new AuthenticationDetails({ Username: email, Password: password }),
      {
        onSuccess: (session) => {
          const token = session.getIdToken().getJwtToken();
          tokenCache.set(email, token);
          resolve(token);
        },
        onFailure: reject,
      }
    );
  });
};

export const getTestToken  = () => getToken(process.env.TEST_USER_EMAIL!,   process.env.TEST_USER_PASSWORD!);
export const getTestToken2 = () => getToken(process.env.TEST_USER_2_EMAIL!, process.env.TEST_USER_2_PASSWORD!);
```

**`src/helpers/client.ts`**
```typescript
import axios from 'axios';
import 'dotenv/config';

export const makeClient = (token: string) =>
  axios.create({
    baseURL: process.env.API_BASE_URL,
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: () => true, // Never throw — let tests assert on status codes
  });
```

**`src/helpers/teardown.ts`**
```typescript
// Registry for resources created during tests.
// Call register() as you create things, then call cleanup() in afterAll.

import { AxiosInstance } from 'axios';

interface Resource {
  type: 'workout' | 'goal';
  id: string;
}

export class TeardownRegistry {
  private resources: Resource[] = [];
  private client: AxiosInstance;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  register(type: Resource['type'], id: string) {
    this.resources.push({ type, id });
  }

  async cleanup() {
    for (const resource of this.resources.reverse()) {
      if (resource.type === 'workout') {
        await this.client.patch(`/workout-instances/${resource.id}`, { status: 'cancelled' });
      }
      if (resource.type === 'goal') {
        await this.client.delete(`/goals/me/${resource.id}`);
      }
    }
    this.resources = [];
  }
}
```

---

## Test Files

**File structure:**
```
packages/integration-tests/src/
├── helpers/
│   ├── auth.ts
│   ├── client.ts
│   └── teardown.ts
├── tests/
│   ├── 01-auth-and-profile.test.ts
│   ├── 02-exercises.test.ts
│   ├── 03-workouts.test.ts
│   ├── 04-metrics.test.ts
│   ├── 05-goals.test.ts
│   └── 06-social.test.ts
```

Files are numbered so Vitest runs them in a predictable order — workout tests must run before metric tests since metrics depend on completed workouts.

---

### 01 — Auth & Profile

```typescript
// src/tests/01-auth-and-profile.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { getTestToken } from '../helpers/auth';
import { makeClient } from '../helpers/client';

describe('Profile', () => {
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
```

---

### 02 — Exercises

```typescript
// src/tests/02-exercises.test.ts
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
    const res = await client.get('/exercises', { params: { muscleGroup: 'chest' } });
    expect(res.status).toBe(200);
    res.data.forEach((ex: any) => {
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
```

---

### 03 — Workouts

```typescript
// src/tests/03-workouts.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestToken } from '../helpers/auth';
import { makeClient } from '../helpers/client';
import { TeardownRegistry } from '../helpers/teardown';

describe('Workout Instances', () => {
  let client: ReturnType<typeof makeClient>;
  let teardown: TeardownRegistry;
  let workoutId: string;
  let exerciseId: string;

  beforeAll(async () => {
    client = makeClient(await getTestToken());
    teardown = new TeardownRegistry(client);

    // Get a real exercise ID from the catalog to use in tests
    const exercises = await client.get('/exercises');
    exerciseId = exercises.data[0].exerciseId;
  });

  afterAll(() => teardown.cleanup());

  it('POST /workout-instances creates an in-progress workout', async () => {
    const res = await client.post('/workout-instances', {
      source: 'manual',
      permissionType: 'PRIVATE',
      exercises: [{
        exerciseId,
        exerciseName: 'Test Exercise',
        modality: 'sets_reps',
        sets: 3,
        reps: 10,
        skipped: false,
        orderIndex: 0,
      }],
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
    const updated = res.data.exercises.find((e: any) => e.exerciseId === exerciseId);
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
    const res = await client.get('/workout-instances', { params: { status: 'completed' } });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.items)).toBe(true);
  });
});
```

---

### 04 — Metrics

> Depends on a completed workout from test file 03. Run sequentially.

```typescript
// src/tests/04-metrics.test.ts
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
```

---

### 05 — Goals

```typescript
// src/tests/05-goals.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestToken } from '../helpers/auth';
import { makeClient } from '../helpers/client';
import { TeardownRegistry } from '../helpers/teardown';

describe('Goals', () => {
  let client: ReturnType<typeof makeClient>;
  let teardown: TeardownRegistry;
  let goalId: string;

  beforeAll(async () => {
    client = makeClient(await getTestToken());
    teardown = new TeardownRegistry(client);
  });

  afterAll(() => teardown.cleanup());

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
    const found = res.data.find((g: any) => g.goalId === goalId);
    expect(found).toBeDefined();
  });

  it('DELETE /goals/me/:id removes the goal', async () => {
    const res = await client.delete(`/goals/me/${goalId}`);
    expect(res.status).toBe(204);
    // Verify it's gone
    const list = await client.get('/goals/me');
    const found = list.data.find((g: any) => g.goalId === goalId);
    expect(found).toBeUndefined();
    // Don't double-cleanup since we deleted it manually
    teardown['resources'] = teardown['resources'].filter(r => r.id !== goalId);
  });
});
```

---

### 06 — Social

```typescript
// src/tests/06-social.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { getTestToken, getTestToken2 } from '../helpers/auth';
import { makeClient } from '../helpers/client';

describe('Social', () => {
  let client1: ReturnType<typeof makeClient>;
  let client2: ReturnType<typeof makeClient>;
  let user2Id: string;

  beforeAll(async () => {
    const [token1, token2] = await Promise.all([getTestToken(), getTestToken2()]);
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
    const found = res.data.find((u: any) => u.userId === user2Id);
    expect(found).toBeDefined();
  });

  it('DELETE /users/:id/follow removes the relationship', async () => {
    const res = await client1.delete(`/users/${user2Id}/follow`);
    expect(res.status).toBe(200);
    const following = await client1.get('/users/me/following');
    const found = following.data.find((u: any) => u.userId === user2Id);
    expect(found).toBeUndefined();
  });
});
```

---

## Running the Tests

```bash
# From monorepo root
pnpm --filter @repwise/integration-tests test

# Watch mode during development
pnpm --filter @repwise/integration-tests test:watch

# Run a single file
pnpm --filter @repwise/integration-tests test 03-workouts
```

---

## Key Conventions

- **`validateStatus: () => true`** on the Axios client means tests always receive a response object regardless of status code. This lets you assert `expect(res.status).toBe(400)` without a try/catch.
- **Numbered test files** enforce execution order. Metrics tests depend on workout data from file 03 — Vitest's `sequence: { sequential: true }` config ensures this.
- **`TeardownRegistry`** keeps tables clean. Register every resource you create; `afterAll` handles deletion even if a test fails midway.
- **Never hardcode exercise IDs.** Always fetch from `GET /exercises` in `beforeAll` and use the returned IDs. The catalog may differ between environments.