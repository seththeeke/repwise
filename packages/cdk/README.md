# Repwise CDK Stack

Backend (API, Lambdas, Auth, Tables) and frontend (S3 + CloudFront) for Repwise.

## Deploy

1. **Build the web app** (required before deploy; assets are taken from `packages/web/dist`):

   ```bash
   pnpm --filter web build
   ```

   For production, set env in `packages/web/.env.production` (or export before build):

   - `VITE_API_BASE_URL` — API Gateway URL (stack output `ApiUrl`)
   - `VITE_COGNITO_USER_POOL_ID` — User Pool ID
   - `VITE_COGNITO_CLIENT_ID` — Client ID
   - `VITE_AI_WORKOUT_STREAM_URL` — AI Lambda Function URL

2. **Deploy the stack:**

   ```bash
   pnpm --filter cdk deploy
   ```

   Or from this directory: `pnpm cdk deploy`

## Outputs

After deploy, stack outputs include:

- `WebsiteUrl` — Frontend URL (CloudFront)
- `CloudFrontDistributionId` — For cache invalidation (`aws cloudfront create-invalidation --distribution-id <id> --paths "/*"`)
- `ApiUrl`, `UserPoolId`, `UserPoolClientId`, `AiWorkoutStreamUrl` — Backend/auth

## Frontend redeploy

To update only the frontend after code changes:

1. `pnpm --filter web build`
2. `pnpm --filter cdk deploy` (BucketDeployment will sync the new `dist` and invalidate CloudFront)
