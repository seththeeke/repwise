# Builder AI Token Accounting Plan

## Goal

Add token usage tracking for the AI workout builder so admins can estimate and monitor Bedrock costs. Persist usage per model and user, expose aggregated statistics on the admin config page, and estimate price on the frontend.

## Data Model

Store usage records in the existing **repwise-workout-builder-ai-config** DynamoDB table alongside the config item. Different PK/SK patterns ensure no collision.

| Attribute   | Type   | Description                                                    |
|------------|--------|----------------------------------------------------------------|
| PK         | string | Model ID (e.g. `amazon.nova-micro-v1:0`)                       |
| SK         | string | `{userId}#{isoTimestamp}` (e.g. `sub123#2024-03-21T10:44:00.000Z`) |
| inputTokens | number | Input tokens consumed                                          |
| outputTokens | number | Output tokens consumed                                       |
| runType    | string | `full` or `regenerate`                                         |
| createdAt  | string | ISO timestamp (same as derived from SK)                        |

- **PK** = model ID enables Query by model for per-model stats.
- **SK** = userId#isoTimestamp gives uniqueness, chronological sort order, and user attribution.
- **runType** distinguishes initial generation vs. regeneration calls.

## Persistence

- **Table**: `repwise-workout-builder-ai-config` (existing).
- **Write**: One PutItem per Bedrock invocation.
- **Permissions**: AI Lambda needs **write** access to the config table (currently read-only).

## AI Lambda Changes

1. **After each Bedrock call** (selectExercises, pickReplacementExercises):
   - Read `response.usage.inputTokens` and `response.usage.outputTokens` from Converse API response.
   - Call a shared `recordTokenUsage()` helper.

2. **`recordTokenUsage()`** (in flows.ts or a new usage module):
   - Params: `modelId`, `userId`, `inputTokens`, `outputTokens`, `runType` (`full` | `regenerate`).
   - Build `PK = modelId`, `SK = userId#isoTimestamp`.
   - PutItem to BUILDER_AI_CONFIG_TABLE.
   - Fire-and-forget: do not block or fail the main flow on write errors (log and continue).

3. **Call sites**:
   - **runFullFlow**: One selectExercises call → one usage record with `runType: 'full'`.
   - **runRegenerateFlow**: One pickReplacementExercises call per regenerated index → one usage record per call with `runType: 'regenerate'`. Pass userId through to flows.

## Backend: Usage Stats Endpoint

**Route**: `GET /admin/builder-ai-config/usage`

**Auth**: Same as existing admin config (builder-admin Cognito group).

**Query params** (optional):
- `modelIds`: Comma-separated list of model IDs to include. If omitted, use the fixed list from the admin UI (all 7 models).

**Response**:
```json
{
  "byModel": {
    "amazon.nova-micro-v1:0": {
      "invocationCount": 42,
      "inputTokens": 125000,
      "outputTokens": 18000,
      "fullCount": 30,
      "regenerateCount": 12
    }
  },
  "totals": {
    "invocationCount": 150,
    "inputTokens": 450000,
    "outputTokens": 75000
  }
}
```

**Implementation**:
- For each model ID (from query param or fixed list), Query PK = modelId.
- Aggregate inputTokens, outputTokens, invocationCount.
- Optionally count runType for full vs regenerate breakdown per model.
- Sum across models for totals.

## Frontend: Admin Config Page

1. **New section**: "Token Usage" below or alongside the config form.
2. **Fetch**: `GET /admin/builder-ai-config/usage` on load (or via a "Refresh" button).
3. **Display**:
   - Table or cards: per-model invocation count, input tokens, output tokens, full vs regenerate counts.
   - Totals row/summary.
4. **Price estimation** (frontend-only):
   - Use published Bedrock pricing per model (hardcoded or config).
   - Compute estimated cost from token counts.
   - Show as "Estimated cost: ~$X.XX" (informational).

## API Client

- Add `builderAiConfigApi.getUsage(query?: { modelIds?: string })` in `packages/web/src/api/builderAiConfig.ts`.

## Files to Change

| File | Changes |
|------|---------|
| `packages/cdk/lib/repwise-stack.ts` | Grant AI Lambda `grantReadWriteData` on builderAiConfigTable (instead of grantReadData). |
| `packages/cdk/lib/repwise-stack.ts` | Add GET `/admin/builder-ai-config/usage` route → builderAiConfigLambda. |
| `packages/lambdas/ai/src/flows.ts` | Add `recordTokenUsage()`, call after selectExercises and pickReplacementExercises; ensure userId + runType passed. |
| `packages/lambdas/ai/src/index.ts` | Extend builderAiConfigHandler to detect path `/admin/builder-ai-config/usage` and return aggregated usage; add Query + aggregation logic. |
| `packages/web/src/api/builderAiConfig.ts` | Add `getUsage()`. |
| `packages/web/src/features/admin/BuilderAiConfigPage.tsx` | Add Token Usage section, fetch and display stats, optional price estimate. |

## Model List for Querying

Use the same list as the admin dropdown when `modelIds` is omitted:

```
amazon.nova-micro-v1:0
amazon.nova-lite-v1:0
amazon.nova-pro-v1:0
amazon.nova-premier-v1:0
anthropic.claude-3-5-haiku-20241022-v1:0
anthropic.claude-sonnet-4-5-20250929-v1:0
anthropic.claude-opus-4-5-20251101-v1:0
```

## Error Handling

- Token recording is non-blocking: failures log and do not fail the workout generation.
- Usage endpoint returns empty/zeros for models with no data.

## Out of Scope (for now)

- Provisioned throughput or Priority/Flex tier tracking.
- Historical time-series (e.g. usage per day); current design is cumulative per model.
- Automated cost alerts.
