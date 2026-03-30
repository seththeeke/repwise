# Repwise CDK Stack

Backend (API, Lambdas, Auth, Tables) and frontend (S3 + CloudFront) for Repwise.

## Custom domains (production)

The stack provisions **ACM** (DNS validation in Route 53) and:

| Host | Purpose |
|------|---------|
| `repwisefit.com`, `www.repwisefit.com` | CloudFront (SPA) |
| `api.repwisefit.com` | HTTP API (API Gateway) |

**Before the first deploy**

1. **Route 53 hosted zone** for `repwisefit.com` must exist in the same AWS account (or delegate NS from the registrar to this zone). The stack uses `HostedZone.fromLookup` for `repwisefit.com`.
2. **First deploy** can take extra time while ACM validates the certificate.

### Cognito custom domain (`auth.repwisefit.com`) — manual

The stack does **not** create `AWS::Cognito::UserPoolDomain` (CloudFormation has been returning `InvalidRequest` for this resource in some accounts). Programmatic auth (Amplify SRP) works without a custom domain.

To add **auth.repwisefit.com** for hosted UI / OAuth:

1. In **ACM (us-east-1)**, request a certificate for `auth.repwisefit.com` (DNS validation in the same Route 53 hosted zone).
2. In **Cognito** → your user pool → **App integration** → **Domain**, add a **custom domain** `auth.repwisefit.com` and attach that ACM certificate (must be **us-east-1**).
3. In **Route 53**, create the **CNAME** Cognito shows (pointing `auth` to the CloudFront hostname Cognito assigns).

JWT issuer for the API remains `https://cognito-idp.<region>.amazonaws.com/<userPoolId>`; the custom domain is for hosted UI URLs only.

### Capacitor (iOS / Android)

API Gateway and Lambda Function URLs **do not** accept `capacitor://` (or similar) in `AllowOrigins`, so the stack uses **`*`** for CORS on the HTTP API and AI Lambda URL. Native WebViews send those custom-scheme origins; an https-only list breaks the app even though the site works in Safari. Authentication remains **JWT** on requests. Rebuild the iOS bundle after updating `VITE_*` in `.env.production`: `pnpm build && pnpm cap:sync`.

## Deploy

1. **Build the web app** (required before deploy; assets are taken from `packages/web/dist`):

   ```bash
   cp packages/web/.env.production.example packages/web/.env.production
   # Edit .env.production: set VITE_COGNITO_* and VITE_AI_WORKOUT_STREAM_URL from stack outputs (or AWS console).
   pnpm --filter web build
   ```

   Production URLs:

   - `VITE_API_BASE_URL` — `https://api.repwisefit.com` (or stack output `ApiUrl`)
   - `VITE_COGNITO_USER_POOL_ID` / `VITE_COGNITO_CLIENT_ID` — stack outputs
   - `VITE_AI_WORKOUT_STREAM_URL` — stack output `AiWorkoutStreamUrl` (Lambda Function URL)

2. **Deploy the stack:**

   ```bash
   pnpm --filter cdk deploy
   ```

   Or from this directory: `pnpm cdk deploy`

## Outputs

After deploy, stack outputs include:

- `WebsiteUrl` — `https://repwisefit.com`
- `CloudFrontDistributionId` — For cache invalidation (`aws cloudfront create-invalidation --distribution-id <id> --paths "/*"`)
- `ApiUrl`, `UserPoolId`, `UserPoolClientId`, `AiWorkoutStreamUrl` — Backend/auth

## Frontend redeploy

To update only the frontend after code changes:

1. `pnpm --filter web build`
2. `pnpm --filter cdk deploy` (BucketDeployment will sync the new `dist` and invalidate CloudFront)
