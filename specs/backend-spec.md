# Repwise — Backend & Infrastructure Spec v2
> This document is optimized for execution in Cursor. Follow the steps in order. Each phase builds on the last. Do not skip phases.
> v2 changes: Added Goals system, lastUsedWeight denormalization on WorkoutExercise, completedDates on GlobalMetrics for calendar widget.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20.x / TypeScript |
| API | AWS API Gateway (HTTP API) |
| Compute | AWS Lambda |
| Auth | AWS Cognito User Pool |
| Database | AWS DynamoDB (3 tables) |
| AI | Anthropic Claude API (via Parameter Store secret) or AWS Bedrock |
| IaC | AWS CDK (TypeScript) |
| Streaming | Server-Sent Events (SSE) via API Gateway + Lambda |
| CI/CD | GitHub Actions |
| Package Manager | pnpm |

---

## Monorepo Structure

```
/
├── packages/
│   ├── cdk/                        # AWS CDK infrastructure
│   ├── lambdas/
│   │   ├── shared/                 # Shared types, DDB clients, utilities
│   │   ├── user/                   # User + follow endpoints
│   │   ├── feed/                   # Feed endpoint
│   │   ├── exercise/               # Exercise catalog endpoints
│   │   ├── workout/                # Workout instance endpoints
│   │   ├── metrics/                # Metrics read endpoints
│   │   ├── goals/                  # Goals CRUD endpoints
│   │   ├── metrics-processor/      # DDB Streams trigger (no API route)
│   │   ├── ai/                     # AI generation logic (SSE)
│   │   └── cognito-post-confirm/   # Cognito post-confirmation trigger
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## Execution Order for Cursor

### Phase 1 — Project Scaffold
### Phase 2 — Shared Package (Types + DDB Client)
### Phase 3 — CDK Infrastructure
### Phase 4 — Cognito Post-Confirmation Lambda
### Phase 5 — User Lambda
### Phase 6 — Exercise Lambda
### Phase 7 — Workout Lambda
### Phase 8 — Metrics Processor Lambda (Streams)
### Phase 9 — Metrics Read Lambda
### Phase 10 — Goals Lambda
### Phase 11 — Feed Lambda
### Phase 12 — AI Lambda (SSE)
### Phase 13 — API Gateway Wiring
### Phase 14 — GitHub Actions CI/CD

---

## Phase 1 — Project Scaffold

```bash
mkdir repwise && cd repwise
pnpm init
pnpm add -D typescript @types/node aws-cdk-lib constructs esbuild
npx tsc --init
mkdir -p packages/cdk packages/lambdas/shared
```

**`pnpm-workspace.yaml`**
```yaml
packages:
  - 'packages/**'
```

**`tsconfig.base.json`**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

---

## Phase 2 — Shared Package

**Location:** `packages/lambdas/shared/`

### 2a — Enums

**`src/enums.ts`**
```typescript
export enum PermissionType {
  PUBLIC = 'PUBLIC',
  FOLLOWERS_ONLY = 'FOLLOWERS_ONLY',
  PRIVATE = 'PRIVATE',
}

export enum WorkoutStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum WorkoutSource {
  AI_GENERATED = 'ai_generated',
  MANUAL = 'manual',
}

export enum ExerciseModality {
  SETS_REPS = 'sets_reps',
  DURATION = 'duration',
  BURNOUT = 'burnout',
}

export enum WeightUnit {
  LBS = 'LBS',
  KG = 'KG',
}

export enum FeedEventType {
  WORKOUT_COMPLETE = 'workout_complete',
  PR_HIT = 'pr_hit',
}

export enum FollowStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
}

// ─── GOALS ───────────────────────────────────────────────────────────────────

export enum GoalType {
  TOTAL_WORKOUTS = 'total_workouts',         // Complete N total workouts
  WORKOUTS_PER_WEEK = 'workouts_per_week',   // Complete N workouts per week
  TOTAL_VOLUME = 'total_volume',             // Lift N lbs total volume
  ONE_REP_MAX = 'one_rep_max',               // Hit N lbs on a specific exercise
  WORKOUT_STREAK = 'workout_streak',         // Maintain N consecutive days
  EXERCISE_SESSIONS = 'exercise_sessions',   // Perform a specific exercise N times
}

export enum GoalTimeframe {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  ALL_TIME = 'all_time',
}

export enum GoalStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
```

### 2b — Data Models

**`src/models.ts`**
```typescript
import {
  PermissionType, WorkoutStatus, WorkoutSource, ExerciseModality,
  WeightUnit, FeedEventType, FollowStatus,
  GoalType, GoalTimeframe, GoalStatus,
} from './enums';

// ─── USER TABLE MODELS ────────────────────────────────────────────────────────

export interface UserProfile {
  PK: string;                        // USER#<userId>
  SK: string;                        // PROFILE
  userId: string;
  email: string;
  username: string;
  displayName: string;
  profilePhoto?: string;
  bio?: string;
  isPrivate: boolean;
  weightUnit: WeightUnit;
  defaultPermissionType: PermissionType;
  createdAt: string;                 // ISO 8601
  followersCount: number;
  followingCount: number;
  streakCount: number;
  lastWorkoutDate?: string;
}

export interface FollowRelationship {
  PK: string;                        // USER#<userId>
  SK: string;                        // FOLLOWS#<targetUserId>
  followedAt: string;
  status: FollowStatus;
  targetUserId: string;
}

export interface FollowerRelationship {
  PK: string;                        // USER#<targetUserId>
  SK: string;                        // FOLLOWER#<userId>
  followedAt: string;
  status: FollowStatus;
  sourceUserId: string;
}

export interface FeedItem {
  PK: string;                        // FEED#<userId>
  SK: string;                        // <timestamp>#<eventId>
  eventId: string;
  eventType: FeedEventType;
  actorUserId: string;
  actorUsername: string;
  actorDisplayName: string;
  actorProfilePhoto?: string;
  summary: string;
  workoutInstanceId?: string;
  isPublic: boolean;
  createdAt: string;
}

// ─── EXERCISE + WORKOUT TABLE MODELS ─────────────────────────────────────────

export interface ExerciseCatalogItem {
  PK: string;                        // EXERCISE#<exerciseId>
  SK: string;                        // METADATA
  exerciseId: string;
  name: string;
  muscleGroups: string[];            // e.g. ['chest', 'triceps']
  muscleGroup: string;               // Primary muscle group — used as GSI partition key
  equipment: string[];               // e.g. ['barbell', 'bench']
  equipmentPrimary: string;          // Primary equipment — used as GSI partition key
  modality: ExerciseModality;
  defaultSets?: number;
  defaultReps?: number;
  defaultDurationSeconds?: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string;
  isActive: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;              // Denormalized at write time from catalog
  modality: ExerciseModality;
  sets?: number;
  reps?: number;
  durationSeconds?: number;
  weight?: number;                   // Filled in by user during execution
  weightUnit?: WeightUnit;
  notes?: string;
  completedAt?: string;
  skipped: boolean;
  orderIndex: number;

  // ── Denormalized at workout creation time from ExerciseMetrics ──────────────
  // Powers the "Last: 185 lbs (4x8) · today" context shown during execution.
  // Snapshot of last known state at session start. Never updated after creation.
  lastUsedWeight?: number;
  lastUsedWeightUnit?: WeightUnit;
  lastPerformedDate?: string;        // ISO date string e.g. '2026-02-28'
}

export interface WorkoutInstance {
  PK: string;                        // USER#<userId>
  SK: string;                        // WORKOUT#<startedAt ISO>#<workoutInstanceId>
  workoutInstanceId: string;
  userId: string;
  status: WorkoutStatus;
  source: WorkoutSource;
  permissionType: PermissionType;
  startedAt: string;
  completedAt?: string;
  durationMinutes?: number;
  totalVolume?: number;              // Sum of (weight * sets * reps) for all completed exercises
  notes?: string;
  exercises: WorkoutExercise[];
}

// ─── METRICS TABLE MODELS ─────────────────────────────────────────────────────

export interface PRRecord {
  weight: number;
  weightUnit: WeightUnit;
  achievedAt: string;
  workoutInstanceId: string;
}

export interface TrendDataPoint {
  date: string;
  avgWeight: number;
  weightUnit: WeightUnit;
  totalVolume: number;
}

export interface ExerciseMetrics {
  PK: string;                        // USER#<userId>
  SK: string;                        // METRIC#EXERCISE#<exerciseId>
  userId: string;
  exerciseId: string;
  exerciseName: string;
  totalSessions: number;
  maxWeight: number;
  maxWeightUnit: WeightUnit;
  maxWeightDate: string;
  lastPerformedDate: string;
  lastUsedWeight: number;            // Most recent weight used (may differ from maxWeight)
  lastUsedWeightUnit: WeightUnit;
  avgWeightLast30?: number;
  avgWeightLast90?: number;
  avgWeightLast180?: number;
  personalRecordHistory: PRRecord[];
  trendData: TrendDataPoint[];       // One entry per session, used for charting
  updatedAt: string;
}

export interface GlobalMetrics {
  PK: string;                        // USER#<userId>
  SK: string;                        // METRIC#GLOBAL
  userId: string;
  totalWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate?: string;
  workoutsLast30: number;
  workoutsLast90: number;
  workoutsLast180: number;
  totalVolumeAllTime: number;
  favoriteMuscleGroup?: string;

  // ── Calendar widget support ──────────────────────────────────────────────────
  // Array of ISO date strings (YYYY-MM-DD) for every day a workout was completed.
  // Appended to (and deduplicated) by the metrics processor on every completion.
  // Client filters to current week for dashboard calendar widget.
  // Client filters to current month for any monthly calendar view.
  completedDates: string[];

  updatedAt: string;
}

// ─── GOALS MODEL ──────────────────────────────────────────────────────────────

export interface Goal {
  PK: string;                        // USER#<userId>
  SK: string;                        // GOAL#<goalId>
  goalId: string;
  userId: string;
  type: GoalType;
  status: GoalStatus;
  title: string;
  description?: string;
  timeframe: GoalTimeframe;
  targetValue: number;               // e.g. 225 for ONE_REP_MAX, 4 for WORKOUTS_PER_WEEK
  currentValue: number;              // Always system-managed — never written by client
  unit?: string;                     // Display label: 'lbs', 'workouts', 'days', 'sessions'
  exerciseId?: string;               // Required for ONE_REP_MAX and EXERCISE_SESSIONS
  exerciseName?: string;             // Denormalized from catalog at creation time
  startDate: string;                 // ISO 8601
  endDate?: string;                  // Derived from timeframe + startDate at creation
  completedAt?: string;
  createdAt: string;
}
```

### 2c — DynamoDB Client

**`src/ddb.ts`**
```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export const USERS_TABLE = process.env.USERS_TABLE!;
export const WORKOUTS_TABLE = process.env.WORKOUTS_TABLE!;
export const METRICS_TABLE = process.env.METRICS_TABLE!;
```

### 2d — Response Helpers

**`src/response.ts`**
```typescript
export const ok = (body: unknown) => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const created = (body: unknown) => ({
  statusCode: 201,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const noContent = () => ({ statusCode: 204, body: '' });

export const badRequest = (message: string) => ({
  statusCode: 400,
  body: JSON.stringify({ error: message }),
});

export const unauthorized = () => ({
  statusCode: 401,
  body: JSON.stringify({ error: 'Unauthorized' }),
});

export const forbidden = () => ({
  statusCode: 403,
  body: JSON.stringify({ error: 'Forbidden' }),
});

export const notFound = (resource = 'Resource') => ({
  statusCode: 404,
  body: JSON.stringify({ error: `${resource} not found` }),
});

export const serverError = (err?: unknown) => {
  console.error(err);
  return {
    statusCode: 500,
    body: JSON.stringify({ error: 'Internal server error' }),
  };
};
```

### 2e — Auth Helper

**`src/auth.ts`**
```typescript
import { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

export const getUserId = (event: APIGatewayProxyEventV2WithJWTAuthorizer): string => {
  return event.requestContext.authorizer.jwt.claims['sub'] as string;
};
```

### 2f — Goal Utility Helpers

**`src/goalUtils.ts`**
```typescript
import { GoalTimeframe } from './enums';
import { Goal } from './models';

// Derives the endDate for a goal based on its timeframe and startDate.
export const deriveEndDate = (startDate: string, timeframe: GoalTimeframe): string | undefined => {
  if (timeframe === GoalTimeframe.ALL_TIME) return undefined;
  const start = new Date(startDate);
  switch (timeframe) {
    case GoalTimeframe.WEEKLY:    start.setDate(start.getDate() + 7);        break;
    case GoalTimeframe.MONTHLY:   start.setMonth(start.getMonth() + 1);      break;
    case GoalTimeframe.QUARTERLY: start.setMonth(start.getMonth() + 3);      break;
    case GoalTimeframe.YEARLY:    start.setFullYear(start.getFullYear() + 1); break;
  }
  return start.toISOString();
};

// Returns true if a goal's timeframe window is still open.
export const isGoalWindowActive = (goal: Pick<Goal, 'endDate'>): boolean => {
  if (!goal.endDate) return true; // ALL_TIME never expires
  return new Date(goal.endDate) > new Date();
};
```

---

## Phase 3 — CDK Infrastructure

**Location:** `packages/cdk/`

### 3a — DynamoDB Tables

```typescript
// lib/tables.ts
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class TablesConstruct extends Construct {
  public readonly usersTable: dynamodb.Table;
  public readonly workoutsTable: dynamodb.Table;
  public readonly metricsTable: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // ── Users Table ──────────────────────────────────────────────────────────
    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'repwise-users',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI: lookup user by username
    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'username-index',
      partitionKey: { name: 'username', type: dynamodb.AttributeType.STRING },
    });

    // ── Workouts Table ───────────────────────────────────────────────────────
    this.workoutsTable = new dynamodb.Table(this, 'WorkoutsTable', {
      tableName: 'repwise-workouts',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES, // Required for metrics processor
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI: query exercises by primary muscle group (powers filter chips + AI catalog queries)
    this.workoutsTable.addGlobalSecondaryIndex({
      indexName: 'muscleGroup-index',
      partitionKey: { name: 'muscleGroup', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
    });

    // GSI: query exercises by primary equipment
    this.workoutsTable.addGlobalSecondaryIndex({
      indexName: 'equipment-index',
      partitionKey: { name: 'equipmentPrimary', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
    });

    // GSI: workout history by userId + completedAt (metrics + history queries)
    this.workoutsTable.addGlobalSecondaryIndex({
      indexName: 'userId-completedAt-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'completedAt', type: dynamodb.AttributeType.STRING },
    });

    // ── Metrics Table ────────────────────────────────────────────────────────
    // Stores ExerciseMetrics, GlobalMetrics, and Goals — all keyed by USER#<userId>
    this.metricsTable = new dynamodb.Table(this, 'MetricsTable', {
      tableName: 'repwise-metrics',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
  }
}
```

### 3b — Cognito User Pool

```typescript
// lib/auth.ts
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class AuthConstruct extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, postConfirmLambda: lambda.Function) {
    super(scope, id);

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'repwise-user-pool',
      selfSignUpEnabled: true,
      signInAliases: { email: true, username: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      lambdaTriggers: {
        postConfirmation: postConfirmLambda,
      },
    });

    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      authFlows: { userSrp: true },
      generateSecret: false,
    });
  }
}
```

### 3c — API Gateway

```typescript
// lib/api.ts
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class ApiConstruct extends Construct {
  public readonly api: apigwv2.HttpApi;

  constructor(scope: Construct, id: string, userPool: cognito.UserPool, userPoolClient: cognito.UserPoolClient) {
    super(scope, id);

    this.api = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: 'repwise-api',
      corsPreflight: {
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: [apigwv2.CorsHttpMethod.ANY],
        allowOrigins: ['*'], // Tighten in production
      },
    });
  }

  addRoute(
    method: apigwv2.HttpMethod,
    path: string,
    handler: lambda.Function,
    authorizer?: apigwv2.IHttpRouteAuthorizer
  ) {
    this.api.addRoutes({
      path,
      methods: [method],
      integration: new integrations.HttpLambdaIntegration(`${method}-${path}`, handler),
      authorizer,
    });
  }
}
```

---

## Phase 4 — Cognito Post-Confirmation Lambda

**Location:** `packages/lambdas/cognito-post-confirm/src/index.ts`

**Trigger:** Fires automatically after a user confirms their email in Cognito.

**Responsibility:** Creates the `UserProfile` record and initializes a blank `GlobalMetrics` record atomically so the dashboard never has to handle a missing metrics state.

```typescript
import { PostConfirmationTriggerEvent } from 'aws-lambda';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, USERS_TABLE, METRICS_TABLE } from '../../shared/src/ddb';
import { UserProfile, GlobalMetrics } from '../../shared/src/models';
import { WeightUnit, PermissionType } from '../../shared/src/enums';

export const handler = async (event: PostConfirmationTriggerEvent) => {
  const userId = event.userName;
  const email = event.request.userAttributes['email'];
  const username = event.request.userAttributes['preferred_username'] ?? email.split('@')[0];
  const now = new Date().toISOString();

  const profile: UserProfile = {
    PK: `USER#${userId}`,
    SK: 'PROFILE',
    userId,
    email,
    username,
    displayName: username,
    isPrivate: false,
    weightUnit: WeightUnit.LBS,
    defaultPermissionType: PermissionType.FOLLOWERS_ONLY,
    createdAt: now,
    followersCount: 0,
    followingCount: 0,
    streakCount: 0,
  };

  const globalMetrics: GlobalMetrics = {
    PK: `USER#${userId}`,
    SK: 'METRIC#GLOBAL',
    userId,
    totalWorkouts: 0,
    currentStreak: 0,
    longestStreak: 0,
    workoutsLast30: 0,
    workoutsLast90: 0,
    workoutsLast180: 0,
    totalVolumeAllTime: 0,
    completedDates: [],
    updatedAt: now,
  };

  await ddb.send(new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: USERS_TABLE,
          Item: profile,
          ConditionExpression: 'attribute_not_exists(PK)', // Idempotent
        },
      },
      {
        Put: {
          TableName: METRICS_TABLE,
          Item: globalMetrics,
          ConditionExpression: 'attribute_not_exists(PK)', // Idempotent
        },
      },
    ],
  }));

  return event; // Must return event for Cognito triggers
};
```

---

## Phase 5 — User Lambda

**Location:** `packages/lambdas/user/src/index.ts`

**Routes handled:**
- `GET /users/me`
- `PATCH /users/me`
- `GET /users/{username}`
- `GET /users/me/followers`
- `GET /users/me/following`
- `POST /users/{userId}/follow`
- `DELETE /users/{userId}/follow`
- `POST /users/me/follow-requests/{userId}/accept`
- `DELETE /users/me/follow-requests/{userId}`

**Key implementation notes:**

- Use a router pattern (e.g. `if (method === 'GET' && path === '/users/me')`) inside a single Lambda handler. Keeps cold start surface area small.
- `GET /users/{username}` must check the viewer's auth status and follow relationship before deciding which fields to return. Unauthenticated viewers only see PUBLIC data.
- Follow/unfollow must atomically update both `FOLLOWS#` and `FOLLOWER#` records and increment/decrement `followersCount` / `followingCount` on both profiles using `TransactWriteCommand`.
- For private accounts, `POST /users/{userId}/follow` sets `status: 'pending'` and does NOT increment counts until accepted.

---

## Phase 6 — Exercise Lambda

**Location:** `packages/lambdas/exercise/src/index.ts`

**Routes handled:**
- `GET /exercises`
- `GET /exercises/{exerciseId}`

**Key implementation notes:**

- `GET /exercises` supports query params: `muscleGroup`, `equipment`, `modality`, `search`.
- If `muscleGroup` is provided, use the `muscleGroup-index` GSI. This powers the horizontal filter chips (All, Chest, Back, Shoulders, Biceps, Tris...) in the manual workout builder.
- If `equipment` is provided, use the `equipment-index` GSI.
- If `search` is provided with no other filters, scan with a FilterExpression on `name`.
- All exercise catalog items have `PK = EXERCISE#<exerciseId>` and `SK = METADATA`.
- Export the query logic as a standalone `queryExercises()` function — the AI Lambda calls this internally and it must not be buried in the handler.

**Seed script:** Create `packages/lambdas/exercise/scripts/seed-catalog.ts` to populate the exercise catalog from a JSON file. Run once after first deploy.

---

## Phase 7 — Workout Lambda

**Location:** `packages/lambdas/workout/src/index.ts`

**Routes handled:**
- `POST /workout-instances`
- `GET /workout-instances`
- `GET /workout-instances/{id}`
- `PATCH /workout-instances/{id}`

**Key implementation notes:**

**POST /workout-instances**
- Accepts `source`, `exercises[]`, `permissionType`, and optional `aiPrompt` object.
- If `aiPrompt` is present, invoke the AI Lambda synchronously via AWS SDK before persisting. See Phase 12.
- Sets `status: in_progress`, generates `workoutInstanceId` (uuid), sets `startedAt`.
- `SK` format: `WORKOUT#<startedAt ISO>#<workoutInstanceId>` — keeps workouts sortable by start time.
- **CRITICAL — lastUsedWeight denormalization:** After resolving the exercise list, query `ExerciseMetrics` for all exercise IDs in a single `BatchGetCommand`. For each exercise that has a metrics record, populate `lastUsedWeight`, `lastUsedWeightUnit`, and `lastPerformedDate` on the `WorkoutExercise` before persisting. This is what powers the "Last: 185 lbs (4x8) · today" execution screen context. It is a snapshot — never updated after creation.

```typescript
// lastUsedWeight population — implement fully in workout Lambda
const metricsKeys = exercises.map(ex => ({
  PK: `USER#${userId}`,
  SK: `METRIC#EXERCISE#${ex.exerciseId}`,
}));

const metricsResults = await batchGetItems(METRICS_TABLE, metricsKeys);
const metricsMap = new Map(metricsResults.map(m => [m.exerciseId, m]));

const enrichedExercises = exercises.map(ex => {
  const metrics = metricsMap.get(ex.exerciseId);
  return {
    ...ex,
    lastUsedWeight: metrics?.lastUsedWeight,
    lastUsedWeightUnit: metrics?.lastUsedWeightUnit,
    lastPerformedDate: metrics?.lastPerformedDate,
  };
});
```

**GET /workout-instances**
- Query by `PK = USER#<userId>` with `SK` begins with `WORKOUT#`.
- Supports `?status=`, `?from=`, `?to=` filters as FilterExpressions.
- Paginate using `LastEvaluatedKey` returned as base64 `nextToken`.

**PATCH /workout-instances/{id}**
- Accepts partial updates to individual exercise fields (`weight`, `weightUnit`, `skipped`, `notes`, `completedAt`), top-level `notes`, and `permissionType`.
- Accepts `status` field for state transitions to `completed` or `cancelled`.
- On transition to `completed`:
  - Validate all non-skipped exercises have a `weight` (or `durationSeconds` for duration modality).
  - Set `completedAt`, calculate `durationMinutes`, calculate `totalVolume` as sum of `(weight * sets * reps)` for all non-skipped sets_reps exercises.
  - DynamoDB Streams will automatically trigger the Metrics Processor.
  - Call feed fan-out utility.
- On transition to `cancelled`: set status only. No side effects.
- Reject transitions away from `completed` or `cancelled` — terminal states are immutable.

**Feed Fan-Out Utility (`packages/lambdas/shared/src/feedFanout.ts`)**
```typescript
// 1. Query USER#<userId> SK begins_with FOLLOWER# to get accepted follower IDs
// 2. Write FeedItem to FEED#<followerId> for each accepted follower
// 3. Write FeedItem to FEED#<userId> (own feed always gets the event)
// 4. Respect permissionType:
//    - PRIVATE: write only to own feed
//    - FOLLOWERS_ONLY: write to accepted followers + own feed
//    - PUBLIC: write to accepted followers + own feed
// 5. Check if any exercise in the workout hit a new maxWeight vs ExerciseMetrics
//    and emit FeedEventType.PR_HIT events for those exercises
```

---

## Phase 8 — Metrics Processor Lambda (DynamoDB Streams)

**Location:** `packages/lambdas/metrics-processor/src/index.ts`

**Trigger:** DynamoDB Stream on the Workouts table (`NEW_AND_OLD_IMAGES`).

**Responsibility:** On workout completion transition, update GlobalMetrics, upsert ExerciseMetrics per exercise, and evaluate all active Goals.

```typescript
import { DynamoDBStreamEvent } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';

export const handler = async (event: DynamoDBStreamEvent) => {
  for (const record of event.Records) {
    if (record.eventName !== 'MODIFY') continue;
    const newImage = unmarshall(record.dynamodb!.NewImage! as any);
    const oldImage = unmarshall(record.dynamodb!.OldImage! as any);
    // Only process the specific in_progress -> completed transition
    if (newImage.status !== 'completed' || oldImage.status === 'completed') continue;
    await processWorkoutCompletion(newImage);
  }
};
```

**Step 1 — Update GlobalMetrics:**

```typescript
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

const updates = {
  totalWorkouts: existing.totalWorkouts + 1,
  currentStreak: calculateStreak(existing.lastWorkoutDate, existing.currentStreak),
  longestStreak: Math.max(
    existing.longestStreak,
    calculateStreak(existing.lastWorkoutDate, existing.currentStreak)
  ),
  lastWorkoutDate: today,
  workoutsLast30: await countWorkoutsInRange(userId, 30),
  workoutsLast90: await countWorkoutsInRange(userId, 90),
  workoutsLast180: await countWorkoutsInRange(userId, 180),
  totalVolumeAllTime: existing.totalVolumeAllTime + (workout.totalVolume ?? 0),
  // Append today and deduplicate. Array.from(new Set(...)) preserves insertion order.
  completedDates: Array.from(new Set([...existing.completedDates, today])),
  updatedAt: new Date().toISOString(),
};
```

**Streak calculation:**

```typescript
const calculateStreak = (lastWorkoutDate: string | undefined, currentStreak: number): number => {
  if (!lastWorkoutDate) return 1;
  const last = new Date(lastWorkoutDate);
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - last.getTime()) / 86400000);
  if (diffDays === 0) return currentStreak;       // Same day, no change
  if (diffDays === 1) return currentStreak + 1;   // Consecutive, increment
  return 1;                                        // Gap detected, reset to 1
};
```

**Step 2 — Upsert ExerciseMetrics per exercise:**

For each non-skipped exercise in the completed workout:
- Upsert the `ExerciseMetrics` record (`PK = USER#<userId>`, `SK = METRIC#EXERCISE#<exerciseId>`).
- Increment `totalSessions`.
- Update `lastUsedWeight`, `lastUsedWeightUnit`, `lastPerformedDate` to values from this workout.
- If `weight > maxWeight`: update `maxWeight`, `maxWeightDate`, append to `personalRecordHistory`.
- Append a new `TrendDataPoint` to `trendData`.
- Recalculate `avgWeightLast30/90/180` by filtering `trendData` to the relevant window and averaging.

**Step 3 — Evaluate Active Goals:**

```typescript
const evaluateGoals = async (userId: string, updatedGlobal: GlobalMetrics, workout: WorkoutInstance) => {
  const activeGoals = await queryGoalsByStatus(userId, GoalStatus.ACTIVE);

  for (const goal of activeGoals) {
    // Check if the goal's timeframe window has expired without completion
    if (!isGoalWindowActive(goal)) {
      await updateGoalStatus(goal.goalId, userId, GoalStatus.FAILED);
      continue;
    }

    let newCurrentValue = goal.currentValue;

    switch (goal.type) {
      case GoalType.TOTAL_WORKOUTS:
        newCurrentValue = updatedGlobal.totalWorkouts;
        break;
      case GoalType.WORKOUTS_PER_WEEK:
        newCurrentValue = await countWorkoutsInWeek(userId, goal.startDate);
        break;
      case GoalType.TOTAL_VOLUME:
        newCurrentValue = await sumVolumeInWindow(userId, goal.startDate, goal.endDate);
        break;
      case GoalType.ONE_REP_MAX:
        if (goal.exerciseId) {
          const em = await getExerciseMetrics(userId, goal.exerciseId);
          newCurrentValue = em?.maxWeight ?? goal.currentValue;
        }
        break;
      case GoalType.WORKOUT_STREAK:
        newCurrentValue = updatedGlobal.currentStreak;
        break;
      case GoalType.EXERCISE_SESSIONS:
        if (goal.exerciseId) {
          const em = await getExerciseMetrics(userId, goal.exerciseId);
          newCurrentValue = em?.totalSessions ?? goal.currentValue;
        }
        break;
    }

    const isNowComplete = newCurrentValue >= goal.targetValue;
    const newStatus = isNowComplete ? GoalStatus.COMPLETED : GoalStatus.ACTIVE;
    await updateGoalProgress(userId, goal.goalId, newCurrentValue, newStatus);
  }
};
```

**Step 4 — Batch all writes atomically:**

Combine GlobalMetrics update + all ExerciseMetrics upserts + all Goal updates into `TransactWriteCommand` calls. Max 100 items per transaction — split into multiple transactions for workouts with many exercises.

---

## Phase 9 — Metrics Read Lambda

**Location:** `packages/lambdas/metrics/src/index.ts`

**Routes handled:**
- `GET /metrics/me/global`
- `GET /metrics/me/exercises`
- `GET /metrics/me/exercises/{exerciseId}`

**Key implementation notes:**

- `GET /metrics/me/global` returns the full `GlobalMetrics` object including `completedDates`. The client filters `completedDates` to the current week for the calendar widget — no server-side filtering needed.
- `GET /metrics/me/exercises` queries `SK` begins with `METRIC#EXERCISE#`. Returns a summary list: exerciseId, exerciseName, totalSessions, maxWeight, maxWeightUnit, lastPerformedDate, lastUsedWeight.
- `GET /metrics/me/exercises/{exerciseId}` returns the full record including `trendData` and `personalRecordHistory`.
- Apply time period filter (`?period=30d|90d|180d|all`) by slicing `trendData` in the Lambda response layer — the full array is always stored.

---

## Phase 10 — Goals Lambda

**Location:** `packages/lambdas/goals/src/index.ts`

**Routes handled:**
- `GET /goals/me`
- `POST /goals/me`
- `DELETE /goals/me/{goalId}`

**GET /goals/me**
- Query `PK = USER#<userId>` with `SK` begins with `GOAL#`.
- Supports `?status=active|completed|failed` as a FilterExpression.
- Client computes display percentage as `Math.min((currentValue / targetValue) * 100, 100)`.

**POST /goals/me**
- Accepts: `type`, `title`, `description`, `timeframe`, `targetValue`, `unit`, `exerciseId`.
- Validate `exerciseId` is present for `ONE_REP_MAX` and `EXERCISE_SESSIONS` types.
- If `exerciseId` provided, fetch exercise from catalog and denormalize `exerciseName`.
- Calculate `endDate` using `deriveEndDate(startDate, timeframe)`.
- Set `currentValue: 0`, `status: active`, generate `goalId` (uuid).
- **Immediately sync currentValue** against existing metrics after creation so progress reflects reality from day one:

```typescript
// Sync currentValue immediately after goal creation
const globalMetrics = await getGlobalMetrics(userId);
const initialValue = await calculateCurrentGoalValue(userId, newGoal, globalMetrics);
if (initialValue > 0) {
  const isComplete = initialValue >= newGoal.targetValue;
  await updateGoalProgress(userId, newGoal.goalId, initialValue,
    isComplete ? GoalStatus.COMPLETED : GoalStatus.ACTIVE
  );
}
```

**DELETE /goals/me/{goalId}**
- Verify the goal's `userId` matches the calling user before deleting.
- Hard delete — no soft delete needed.

---

## Phase 11 — Feed Lambda

**Location:** `packages/lambdas/feed/src/index.ts`

**Routes handled:**
- `GET /feed`

**Key implementation notes:**

- Query `PK = FEED#<userId>`, sorted by `SK` descending (timestamp prefix on SK ensures chronological sort).
- Accepts `?limit=20&lastKey=<paginationToken>`.
- Decode `lastKey` from base64 to use as DynamoDB `ExclusiveStartKey`.
- Return `nextToken` (base64-encoded `LastEvaluatedKey`) for client-side pagination.
- Feed items are pre-written by the fan-out in the Workout Lambda — this Lambda is read-only.

---

## Phase 12 — AI Lambda (SSE)

**Location:** `packages/lambdas/ai/src/index.ts`

**Invocation:** Called synchronously by the Workout Lambda via `AWS SDK Lambda.invoke` when `POST /workout-instances` includes an `aiPrompt` field. Not directly exposed as an API Gateway route.

**SSE Response Pattern:**

```typescript
const sseHeaders = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',
};
```

**SSE event sequence:**
```
event: progress
data: {"step": "analyzing_goals", "message": "Analyzing your fitness goals..."}

event: progress
data: {"step": "scanning_catalog", "message": "Scanning exercise catalog..."}

event: progress
data: {"step": "reviewing_history", "message": "Reviewing your recent workouts..."}

event: progress
data: {"step": "balancing_muscles", "message": "Balancing muscle groups..."}

event: progress
data: {"step": "optimizing_structure", "message": "Optimizing workout structure..."}

event: complete
data: { <WorkoutExercise[] payload — not yet persisted, client reviews before confirming> }
```

**Prompt construction:**

```typescript
const buildPrompt = (
  userPrompt: string,
  catalog: ExerciseCatalogItem[],
  recentWorkouts: WorkoutInstance[],
  activeGoals: Goal[],
  userPrefs: { weightUnit: WeightUnit }
): string => `
You are a professional fitness coach building a personalized workout.

User request: "${userPrompt}"

User's active goals — use these to inform exercise selection and priorities:
${JSON.stringify(activeGoals, null, 2)}

Available exercises:
${JSON.stringify(catalog, null, 2)}

Recent workouts — avoid repeating the same primary muscle groups from the last 1-2 sessions:
${JSON.stringify(recentWorkouts.slice(0, 5), null, 2)}

Return ONLY a valid JSON array of WorkoutExercise objects. No explanation. No markdown. No code fences.
Each object must include: exerciseId, exerciseName, modality, sets, reps or durationSeconds, orderIndex.
Do not include weight — the user will enter that during execution.
`;
```

**Anthropic API key via SSM Parameter Store:**

```typescript
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const getApiKey = async (): Promise<string> => {
  const ssm = new SSMClient({});
  const res = await ssm.send(new GetParameterCommand({
    Name: '/repwise/anthropic-api-key',
    WithDecryption: true,
  }));
  return res.Parameter!.Value!;
};
```

Store key before first deploy:
```bash
aws ssm put-parameter \
  --name "/repwise/anthropic-api-key" \
  --value "sk-ant-..." \
  --type SecureString
```

---

## Phase 13 — API Gateway Route Wiring

All routes require Cognito JWT authorizer except `GET /users/{username}`.

```typescript
const routes = [
  // Users
  { method: HttpMethod.GET,    path: '/users/me',                                  lambda: userLambda,    auth: true  },
  { method: HttpMethod.PATCH,  path: '/users/me',                                  lambda: userLambda,    auth: true  },
  { method: HttpMethod.GET,    path: '/users/{username}',                           lambda: userLambda,    auth: false },
  { method: HttpMethod.GET,    path: '/users/me/followers',                         lambda: userLambda,    auth: true  },
  { method: HttpMethod.GET,    path: '/users/me/following',                         lambda: userLambda,    auth: true  },
  { method: HttpMethod.POST,   path: '/users/{userId}/follow',                      lambda: userLambda,    auth: true  },
  { method: HttpMethod.DELETE, path: '/users/{userId}/follow',                      lambda: userLambda,    auth: true  },
  { method: HttpMethod.POST,   path: '/users/me/follow-requests/{userId}/accept',   lambda: userLambda,    auth: true  },
  { method: HttpMethod.DELETE, path: '/users/me/follow-requests/{userId}',          lambda: userLambda,    auth: true  },
  // Feed
  { method: HttpMethod.GET,    path: '/feed',                                       lambda: feedLambda,    auth: true  },
  // Exercises
  { method: HttpMethod.GET,    path: '/exercises',                                  lambda: exerciseLambda, auth: true },
  { method: HttpMethod.GET,    path: '/exercises/{exerciseId}',                     lambda: exerciseLambda, auth: true },
  // Workouts
  { method: HttpMethod.POST,   path: '/workout-instances',                          lambda: workoutLambda, auth: true  },
  { method: HttpMethod.GET,    path: '/workout-instances',                          lambda: workoutLambda, auth: true  },
  { method: HttpMethod.GET,    path: '/workout-instances/{id}',                     lambda: workoutLambda, auth: true  },
  { method: HttpMethod.PATCH,  path: '/workout-instances/{id}',                     lambda: workoutLambda, auth: true  },
  // Metrics
  { method: HttpMethod.GET,    path: '/metrics/me/global',                          lambda: metricsLambda, auth: true  },
  { method: HttpMethod.GET,    path: '/metrics/me/exercises',                       lambda: metricsLambda, auth: true  },
  { method: HttpMethod.GET,    path: '/metrics/me/exercises/{exerciseId}',          lambda: metricsLambda, auth: true  },
  // Goals
  { method: HttpMethod.GET,    path: '/goals/me',                                   lambda: goalsLambda,   auth: true  },
  { method: HttpMethod.POST,   path: '/goals/me',                                   lambda: goalsLambda,   auth: true  },
  { method: HttpMethod.DELETE, path: '/goals/me/{goalId}',                          lambda: goalsLambda,   auth: true  },
];
```

---

## Phase 14 — GitHub Actions CI/CD

**`.github/workflows/deploy.yml`**

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build all packages
        run: pnpm -r build

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: CDK Deploy
        run: pnpm --filter cdk run cdk deploy --require-approval never
```

---

## Environment Variables per Lambda

| Variable | Lambdas that need it |
|---|---|
| `USERS_TABLE` | user, cognito-post-confirm, workout (fan-out), metrics-processor |
| `WORKOUTS_TABLE` | workout, exercise, metrics-processor, ai |
| `METRICS_TABLE` | metrics, goals, metrics-processor, workout (lastUsedWeight lookup), ai (active goals) |
| `AWS_REGION` | all |

Set all env vars in CDK via `lambda.addEnvironment(...)` — never hardcode.

---

## IAM Permissions Summary

| Lambda | Permissions |
|---|---|
| user | users table: read/write |
| exercise | workouts table: read (exercises only) |
| workout | workouts table: read/write, users table: read (fan-out), metrics table: read (lastUsedWeight) |
| metrics | metrics table: read |
| goals | metrics table: read/write |
| metrics-processor | metrics table: read/write, workouts table: read |
| feed | users table: read (feed items) |
| ai | workouts table: read (catalog + history), metrics table: read (active goals), ssm: GetParameter |
| cognito-post-confirm | users table: write, metrics table: write (GlobalMetrics init) |

---

## DynamoDB Key Schema Reference

### Users Table (`repwise-users`)

| Record Type | PK | SK |
|---|---|---|
| User profile | `USER#<userId>` | `PROFILE` |
| Follow relationship (outbound) | `USER#<userId>` | `FOLLOWS#<targetUserId>` |
| Follow relationship (inbound) | `USER#<targetUserId>` | `FOLLOWER#<userId>` |
| Feed item | `FEED#<userId>` | `<ISO timestamp>#<eventId>` |

### Workouts Table (`repwise-workouts`)

| Record Type | PK | SK |
|---|---|---|
| Exercise catalog item | `EXERCISE#<exerciseId>` | `METADATA` |
| Workout instance | `USER#<userId>` | `WORKOUT#<startedAt>#<workoutInstanceId>` |

### Metrics Table (`repwise-metrics`)

| Record Type | PK | SK |
|---|---|---|
| Global metrics | `USER#<userId>` | `METRIC#GLOBAL` |
| Per-exercise metrics | `USER#<userId>` | `METRIC#EXERCISE#<exerciseId>` |
| Goal | `USER#<userId>` | `GOAL#<goalId>` |

---

## Key Design Decisions Reference

| Decision | Choice | Reason |
|---|---|---|
| Template vs instance only | Instance only with `source` field | Avoids unnecessary entity, same insight available |
| Exercise completion type | Fixed to exercise definition | Simpler AI prompts, consistent execution UX |
| Weight fields | `weight` + `weightUnit` enum | No redundant fields, unit preserved in history |
| Visibility | `permissionType` enum (PUBLIC, FOLLOWERS_ONLY, PRIVATE) | Extensible, intent is explicit |
| Metrics timing | Pre-built via DDB Streams | Fast reads, deterministic backfill |
| AI streaming | SSE with named progress events | Better UX, avoids API GW 29s timeout risk |
| Individual set tracking | Not tracked | User inputs one value per exercise per session |
| Custom exercises | Not allowed | Master catalog only, simplifies AI and search |
| Feed strategy | Fan-out at write time | Fast feed reads, follower counts are small |
| lastUsedWeight | Denormalized into WorkoutExercise at creation | Zero extra reads during execution screen load |
| completedDates | Stored as deduped list on GlobalMetrics | Calendar widget reads in single API call with no extra query |
| Goals storage | Metrics table, same PK as user metrics | All user aggregates co-located, efficient single-partition reads |
| Goal currentValue | System-managed only, never client-written | Prevents data integrity issues, single source of truth |
| Goal evaluation | Inside metrics processor after every workout | Single write path, no separate scheduler or cron needed |
| Goal initial sync | Evaluated immediately on creation | Handles goals created after user already has relevant history |