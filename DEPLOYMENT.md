# Repwise — Deployment & Development Guide

This document covers how to build, deploy, and run Repwise. For a product overview, see [README.md](README.md).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js 20.x, TypeScript, AWS Lambda, API Gateway (HTTP API), DynamoDB, Cognito |
| **AI** | Anthropic Claude (or AWS Bedrock), SSE for streaming workout generation |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router, Zustand, TanStack Query, AWS Amplify (Cognito) |
| **Infrastructure** | AWS CDK (TypeScript), GitHub Actions CI/CD |
| **Monitoring** | CloudWatch (alarms, dashboard, log groups) — free-tier first |
| **Package manager** | pnpm |

---

## Repository structure

The project is a **pnpm monorepo**. Target layout (as specified):

```
/
├── packages/
│   ├── cdk/                    # AWS CDK infrastructure (tables, auth, API, monitoring)
│   ├── lambdas/
│   │   ├── shared/             # Shared types, DDB client, utilities (source of truth for models)
│   │   ├── user/               # User + follow endpoints
│   │   ├── feed/               # Feed endpoint
│   │   ├── exercise/           # Exercise catalog endpoints
│   │   ├── workout/            # Workout instance CRUD + AI invoke
│   │   ├── metrics/            # Metrics read endpoints
│   │   ├── goals/              # Goals CRUD endpoints
│   │   ├── metrics-processor/  # DynamoDB Streams → update metrics & goals (no API route)
│   │   ├── ai/                 # AI workout generation (SSE, invoked by workout Lambda)
│   │   └── cognito-post-confirm/
│   └── web/                    # React frontend (dashboard, workout builder, execution, goals, feed, profile)
│   └── integration-tests/     # Vitest integration tests (run against deployed API)
├── specs/                      # Implementation specs (follow in order)
│   ├── backend-spec.md         # Backend & infrastructure
│   ├── frontend-spec.md        # Web app
│   └── monitoring-spec.md      # CloudWatch alarms & dashboard
├── prototype-app/              # Standalone React prototype (mock backend) for UX iteration
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

- **Backend** and **frontend** types are shared: `packages/lambdas/shared` is the single source of truth; `packages/web` re-exports from it.
- **Specs** in `specs/` define phases and implementation order; build the stack by following them in sequence.

---

## Specs and build order

Implementation is specified in the `specs/` directory. Use them in this order:

1. **Backend & infrastructure** — [specs/backend-spec.md](specs/backend-spec.md)  
   Project scaffold, shared package, CDK (tables, Cognito, API Gateway, Lambdas), user, exercise, workout, metrics processor, metrics read, goals, feed, AI Lambda, route wiring, CI/CD.

2. **Frontend** — [specs/frontend-spec.md](specs/frontend-spec.md)  
   Scaffold, API client, auth (Cognito/Amplify), stores, design system, dashboard, workout builder, workout execution, catalog, metrics & exercise detail, goals, feed, profile & settings, routing, desktop layout.

3. **Monitoring** — [specs/monitoring-spec.md](specs/monitoring-spec.md)  
   CloudWatch dashboard, alarms, log groups, optional SNS email alerts. Designed for free-tier-first and minimal custom metrics.

4. **Integration tests** — [specs/integration-test-spec.md](specs/integration-test-spec.md)  
   Vitest suite in `packages/integration-tests/` that runs against the deployed API (auth, profile, exercises, workouts, metrics, goals, social). Requires `.env.test` with API URL and Cognito test user credentials.

---

## Prerequisites

- **Node.js** 20.x  
- **pnpm**  
- **AWS CLI** configured (for deploy and seed)  
- **AWS CDK** bootstrap in the target account/region (one-time)

---

## Quick start (after implementation)

Once the monorepo is built from the specs:

```bash
pnpm install
pnpm -r build
```

- **Deploy backend:**  
  From repo root: `pnpm --filter cdk run cdk deploy --require-approval never`  
  Or from `packages/cdk`: `pnpm run cdk deploy --require-approval never`  
  Use one of these (so the project's CDK CLI version is used); avoid running a global `cdk` to prevent schema version mismatch.  
  (Anthropic API key in SSM if using Claude; exercise catalog seed as in backend-spec.)

- **Run frontend:**  
  `pnpm --filter web run dev`  
  Copy `packages/web/.env.example` to `packages/web/.env.local` and set `VITE_COGNITO_USER_POOL_ID` and `VITE_COGNITO_CLIENT_ID` (same values as integration tests) so the Amplify login/signup/forgot-password flow works. Set `VITE_API_BASE_URL` when the API is deployed.

- **Prototype only (no backend):**  
  `cd prototype-app && pnpm install && pnpm dev`  
  Uses mock data for UX iteration.

- **Build & run iOS app (Capacitor):**  
  Repwise can run natively on iPhone via Capacitor. See [specs/capacitor-ios-plan.md](specs/capacitor-ios-plan.md) for full details. Quick flow: ensure `packages/web/.env.production` (or `.env.ios`) has the same `VITE_*` values as production; then `pnpm build:ios` (builds web + syncs to iOS), and `pnpm --filter web cap:open:ios` to open Xcode. Requires macOS and Xcode.

---

## Auth (Cognito) — manual steps for integration tests

The stack does not create test users. After deploying:

1. **Create a test user** in the User Pool (AWS Console → Cognito → User Pools → your pool → Create user), or via CLI:

   ```bash
   aws cognito-idp admin-create-user --user-pool-id <UserPoolId> \
     --username testuser@repwise-test.com \
     --user-attributes Name=email,Value=testuser@repwise-test.com Name=email_verified,Value=true \
     --temporary-password 'TempPass123!' --message-action SUPPRESS
   aws cognito-idp admin-set-user-password --user-pool-id <UserPoolId> \
     --username testuser@repwise-test.com --password 'TestPass123!' --permanent
   ```
   (Use the same for a second user if you need social tests: `testuser2@repwise-test.com`.)

2. **Copy CDK outputs into** `packages/integration-tests/.env.test`:
   - `API_BASE_URL` = stack output **ApiUrl** (e.g. `https://xxx.execute-api.us-east-1.amazonaws.com`)
   - `COGNITO_USER_POOL_ID` = stack output **UserPoolId**
   - `COGNITO_CLIENT_ID` = stack output **UserPoolClientId**
   - `TEST_USER_EMAIL=testuser@repwise-test.com`
   - `TEST_USER_PASSWORD=TestPass123!`
   - (Optional) `TEST_USER_2_EMAIL`, `TEST_USER_2_PASSWORD` for the second test user.

   **Exercise catalog:** So that `GET /exercises` returns data, run the seed once after deploy (see backend-spec or `packages/lambdas/scripts/seed-catalog.ts`), with `WORKOUTS_TABLE` set to the stack's workouts table name.

3. **Run the Cognito auth integration test:**

   ```bash
   pnpm --filter @repwise/integration-tests test -- src/tests/00-cognito-auth.test.ts
   ```

---

## Design decisions (reference)

| Area | Choice | Reason |
|------|--------|--------|
| Workouts | Instance-only, no "templates" | Simpler model; source (manual/AI) is stored on each instance |
| Metrics | Pre-built via DynamoDB Streams | Fast reads, no ad-hoc aggregation at request time |
| Goals | Stored in metrics table; evaluated in metrics-processor | Single write path, no cron; goals and metrics stay in sync |
| AI | SSE from Lambda (invoked by workout Lambda) | Better UX and avoids API Gateway timeout limits |
| Feed | Fan-out at write time | Fast feed reads; follower counts are small |
| Types | Shared package in `lambdas/shared` | One source of truth for API and frontend |

---

## License

Proprietary. All rights reserved.
