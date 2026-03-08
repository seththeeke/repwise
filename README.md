# Repwise

**Repwise** is a fitness application for creating and tracking workouts. Users can build workouts manually or with AI, execute them with a mobile-optimized flow, track personal records and metrics, set and monitor goals, and follow other users’ activity in a feed.

---

## Features

- **Workouts** — Create workouts manually (pick from an exercise catalog) or via AI generation. Start a session, log weight and reps (or duration), and complete or cancel with a simple execution UI.
- **Exercise catalog** — Searchable catalog with muscle groups, equipment, and modality (sets/reps, duration, burnout). Used by both manual builder and AI.
- **Metrics** — Pre-computed global metrics (streak, total workouts, volume, calendar) and per-exercise metrics (PRs, trend data, last-used weight). Updated automatically when workouts are completed.
- **Goals** — Set goals (total workouts, workouts per week, total volume, one-rep max, streak, exercise sessions, total time). Progress is system-managed and evaluated on every workout completion.
- **Feed** — Activity feed of workout completions and PRs from users you follow. Visibility respects permission (public, followers-only, private).
- **Profile & social** — User profiles with followers/following, follow requests for private accounts, and configurable workout visibility.

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
  `pnpm --filter cdk run cdk deploy --require-approval never`  
  (Anthropic API key in SSM if using Claude; exercise catalog seed as in backend-spec.)

- **Run frontend:**  
  `pnpm --filter web run dev`  
  (Set `VITE_API_BASE_URL` to your API Gateway URL.)

- **Prototype only (no backend):**  
  `cd prototype-app && pnpm install && pnpm dev`  
  Uses mock data for UX iteration.

---

## Design decisions (reference)

| Area | Choice | Reason |
|------|--------|--------|
| Workouts | Instance-only, no “templates” | Simpler model; source (manual/AI) is stored on each instance |
| Metrics | Pre-built via DynamoDB Streams | Fast reads, no ad-hoc aggregation at request time |
| Goals | Stored in metrics table; evaluated in metrics-processor | Single write path, no cron; goals and metrics stay in sync |
| AI | SSE from Lambda (invoked by workout Lambda) | Better UX and avoids API Gateway timeout limits |
| Feed | Fan-out at write time | Fast feed reads; follower counts are small |
| Types | Shared package in `lambdas/shared` | One source of truth for API and frontend |

---

## License

Proprietary. All rights reserved.
