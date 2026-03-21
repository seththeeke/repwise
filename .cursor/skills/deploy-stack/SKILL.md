---
name: deploy-stack
description: Builds and deploys the full Repwise CDK stack to AWS. Use when the user wants to deploy, push changes to production, or update the live stack.
---

# Deploy Stack

## Quick deploy

From the project root:

```bash
pnpm run build && cd packages/cdk && pnpm run deploy -- --require-approval never
```

Or in one step (build runs as dependency of deploy in practice—CDK bundles fresh; for safety, build first):

```bash
pnpm run build
cd packages/cdk && pnpm run deploy -- --require-approval never
```

## Prerequisites

- AWS credentials configured (`aws configure`, AWS SSO, or env vars)
- `CDK_DEFAULT_ACCOUNT` and `CDK_DEFAULT_REGION` set if not using default profile (region defaults to `us-east-1`)

## What gets deployed

- **RepwiseStack** (CloudFormation): API Gateway, Lambdas (AI, workout, exercise, goals, feed, etc.), DynamoDB tables, Cognito, S3 + CloudFront for the web app
- Website to CloudFront (`WebsiteUrl`)
- API to API Gateway (`ApiUrl`)
- AI workout stream Lambda URL (`AiWorkoutStreamUrl`)

## Optional: review changes first

To see what would change without deploying:

```bash
cd packages/cdk && pnpm run cdk diff
```

## Optional: synth only

To synthesize the CloudFormation template without deploying:

```bash
cd packages/cdk && pnpm run synth
```
