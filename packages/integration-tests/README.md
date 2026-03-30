# Integration tests

Vitest-based integration tests against the **deployed** Repwise API. See [specs/integration-test-spec.md](../../specs/integration-test-spec.md) for full details.

## Setup

1. Copy `.env.test.example` to `.env.test` in this directory.
2. Fill in values from your deployed stack (API URL, Cognito User Pool ID and Client ID, test user credentials).
3. Ensure the backend is deployed and test users are provisioned (CDK creates them in non-prod when configured per the spec).

## Run

```bash
# From repo root
pnpm --filter @repwise/integration-tests test

# Watch mode
pnpm --filter @repwise/integration-tests test:watch

# Single file
pnpm --filter @repwise/integration-tests test 03-workouts
```

Tests run **sequentially** so that metrics tests run after workout tests (shared test user data).

**Account deletion** (`09-account-deletion.test.ts`) runs only when `TEST_DELETE_USER_EMAIL` and `TEST_DELETE_USER_PASSWORD` are set in `.env.test`. Use a **separate** Cognito user created only for this test — not the primary `TEST_USER_EMAIL` account used by the rest of the suite.
