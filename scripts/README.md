# Scripts

## clear-user-data

Clears **workout** and **metric** (including goals) data for a single user. Safe for test-user resets.

- **Does not delete:** exercise catalog, other users’ data, or the user’s profile.
- **Requires:** `USER_ID` (Cognito sub), AWS CLI, `jq`. Table names default to `repwise-workouts` and `repwise-metrics` if not set.

### Get your test user’s USER_ID (Cognito sub)

1. **AWS Console:** Cognito → User Pools → your pool → Users → select user → copy **sub**.
2. **From the app:** After login, call your “me” or user API and use the `sub` (or equivalent) from the response.
3. **From a JWT:** Decode the ID token and use the `sub` claim.

### Run

From repo root (uses AWS CLI default profile/credentials):

```bash
USER_ID=<cognito-sub> pnpm run clear-user-data
```

Or run the script directly:

```bash
USER_ID=<cognito-sub> ./scripts/clear-user-data.sh
```

With explicit table names:

```bash
USER_ID=<cognito-sub> \
WORKOUTS_TABLE=repwise-workouts \
METRICS_TABLE=repwise-metrics \
./scripts/clear-user-data.sh
```
