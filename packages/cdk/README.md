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

### Cognito OAuth domain (managed)

The stack creates a **Cognito-managed** hosted UI domain (`repwise<account>.auth.<region>.amazoncognito.com`) so Amplify can use `signInWithRedirect` (Sign in with Apple, etc.). Stack output **`CognitoOAuthDomain`** is the **full hostname** (no `https://`) — set **`VITE_COGNITO_OAUTH_DOMAIN`** in the web app to that exact value.

**Callback / sign-out URLs** registered on the app client include `http://localhost:5173/`, `https://repwisefit.com/`, and `com.repwise.app://callback` (iOS custom scheme).

### Sign in with Apple (optional)

1. In **Apple Developer**: create a **Services ID** (e.g. `com.repwise.web`) for Sign in with Apple; set **Return URLs** to  
   `https://<CognitoOAuthDomain>/oauth2/idpresponse` (use the managed domain from the stack output).
2. Create a **Sign in with Apple** key and note **Team ID**, **Key ID**, and download the **.p8** private key.
3. Deploy the CDK stack with environment variables (do not commit the key):

   ```bash
   export APPLE_SERVICES_ID=com.your.services.id
   export APPLE_TEAM_ID=XXXXXXXXXX
   export APPLE_KEY_ID=XXXXXXXXXX
   export APPLE_PRIVATE_KEY="$(cat AuthKey_XXXXX.p8)"   # or paste PEM; newlines can be \\n in env
   pnpm --filter cdk deploy
   ```

   If these are **not** set, the pool still supports email/password; Sign in with Apple is omitted until you add the IdP manually in the Cognito console or redeploy with the variables.

4. In the web app, set **`VITE_APPLE_SIGNIN_ENABLED=true`** (and **`VITE_COGNITO_OAUTH_DOMAIN`**) after deploy.

### Cognito custom domain (`auth.repwisefit.com`) — optional, manual

You can still add a **branded** custom domain in the Cognito console for hosted UI URLs; the managed domain above is sufficient for OAuth. If you use a custom domain, update **`VITE_COGNITO_OAUTH_DOMAIN`** to that hostname and align Apple Return URLs with the custom domain’s `/oauth2/idpresponse` endpoint.

JWT issuer for the API remains `https://cognito-idp.<region>.amazonaws.com/<userPoolId>`.

### Capacitor (iOS / Android)

API Gateway and Lambda Function URLs **do not** accept `capacitor://` (or similar) in `AllowOrigins`, so the stack uses **`*`** for CORS on the HTTP API and AI Lambda URL. Native WebViews send those custom-scheme origins; an https-only list breaks the app even though the site works in Safari. Authentication remains **JWT** on requests. Rebuild the iOS bundle after updating `VITE_*` in `.env.production`: `pnpm build && pnpm cap:sync`.

## Deploy

1. **Build the web app** (required before deploy; assets are taken from `packages/web/dist`):

   ```bash
   cp packages/web/.env.production.example packages/web/.env.production
   # Edit .env.production: set VITE_COGNITO_* , VITE_COGNITO_OAUTH_DOMAIN, VITE_APPLE_SIGNIN_ENABLED (if using Apple), and VITE_AI_WORKOUT_STREAM_URL from stack outputs.
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
- `ApiUrl`, `UserPoolId`, `UserPoolClientId`, `CognitoOAuthDomain`, `AiWorkoutStreamUrl` — Backend/auth / OAuth

## Frontend redeploy

To update only the frontend after code changes:

1. `pnpm --filter web build`
2. `pnpm --filter cdk deploy` (BucketDeployment will sync the new `dist` and invalidate CloudFront)
