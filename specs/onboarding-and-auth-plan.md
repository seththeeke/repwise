---
name: New user onboarding and auth
overview: Add first-time onboarding with user "Gyms" (default "My Gym" and equipment optional), optional AI-generated goals via a dedicated GoalsAILambda, a one-time prompt to use the "+" workout button, and sign-up / forgot-password on the login page. Backend adds Gyms CRUD, profile defaultGymId and onboardingCompletedAt, WorkoutInstance gymId/gymName, and a lightweight GoalsAILambda for goal suggestions.
todos: []
isProject: false
---

# New User Onboarding and Auth Flows

## 1. Backend: Profile, Gyms, and API

**1.1 Gyms model and profile (replace single "default workout environment")**

- **Data model**
  - **Gym** (per user): `gymId` (UUID), `name` (string), `equipmentTypes` (string[] — same six categories: dumbbells, free_weights, cables, weight_rack, cardio, machines). Store in **USERS_TABLE** (or a dedicated table) with `PK = USER#<userId>`, `SK = GYM#<gymId>` so all gyms for a user are queryable.
  - **UserProfile** in [packages/lambdas/shared/src/models.ts](packages/lambdas/shared/src/models.ts): add `defaultGymId?: string` (which gym is the default) and `onboardingCompletedAt?: string` (ISO date; undefined = first-time user). Do **not** add `defaultWorkoutEnvironment`; equipment is always expressed via the selected Gym.
  - **WorkoutInstance** in shared models: add `gymId?: string` and `gymName?: string` (denormalized for display) so each workout records which gym was used; the AI Lambda and workout builder use the selected gym's `equipmentTypes` for generation/filtering.
- **Gyms API** (new Lambda or extend user Lambda with sub-resources):
  - `GET /users/me/gyms` — list gyms for the authenticated user (query by PK = USER#userId, begins_with SK = GYM#). Return array of `{ gymId, name, equipmentTypes }`; include which is default via profile's `defaultGymId`.
  - `POST /users/me/gyms` — create gym: body `{ name, equipmentTypes }`; generate `gymId`; write item with SK = GYM#gymId.
  - `PATCH /users/me/gyms/:gymId` — update gym name and/or equipmentTypes.
  - `DELETE /users/me/gyms/:gymId` — delete gym (optional: forbid if it's the only gym or if default; or allow and clear default).
  - Profile's `defaultGymId` is set via `PATCH /users/me` (add `defaultGymId` to allowed list in [packages/lambdas/user/src/index.ts](packages/lambdas/user/src/index.ts)).
- **Cognito post-confirm**: Do not create any gym; leave `defaultGymId` and `onboardingCompletedAt` undefined so first GET /users/me indicates "needs onboarding."
- **Onboarding flow (backend)**: When onboarding completes, the app will call `POST /users/me/gyms` with name `"My Gym"` and `equipmentTypes` = all six (if user skipped equipment) or the user's selection, then `PATCH /users/me` with `defaultGymId: <newGymId>` and `onboardingCompletedAt: now`.
- **Profile page (frontend)**: List user's gyms (from GET /users/me/gyms), show default badge; "Add gym" (name + equipment cards, same UX as onboarding); "Edit" per gym (name + equipment); "Set as default" updates `defaultGymId` via PATCH /users/me. Model this UI on the profile so it's the source of truth for managing gyms.
- **Workout builder**: Dropdown that lists the user's gyms (default gym pre-selected). Selected gym is sent to the AI workout Lambda (e.g. as `gymId` or `equipmentTypes` in the request body) and stored on the workout instance when the workout is created (e.g. when calling POST /workout-instances, include `gymId` and `gymName`; workout Lambda and AI Lambda accept and persist these).

**1.2 Goals-from-text (GenAI) — separate GoalsAILambda**

- Use a **separate Lambda**, **GoalsAILambda**, dedicated to goal suggestions so the existing AI Lambda stays focused on workout generation and is not overloaded.
  - Accepts POST with body `{ "freeText": "e.g. I want to workout 3x per week and hit 12 workouts this month" }`.
  - Calls **Bedrock** (same Nova Micro pattern as in [packages/lambdas/ai/src/flows.ts](packages/lambdas/ai/src/flows.ts)) with a small prompt that returns a JSON array of goal suggestions: each with `type` (from existing GoalType enum), `title`, `timeframe`, `targetValue`, optional `unit`.
  - Returns that array to the client; does **not** create goals in DynamoDB.
- Frontend calls `POST /goals/me/suggest` (or similar), then for each selected suggestion calls existing `POST /goals/me` to create goals.
- CDK: New **GoalsAILambda** (Node, Bedrock InvokeModel permission for Nova Micro), and new route `POST /goals/me/suggest` on the API, backed by GoalsAILambda. No changes to the existing AI Lambda.

---

## 2. Frontend: Auth (Sign-up and Forgot password)

**2.1 Login / landing surface**

- Keep a single entry point for "Log in" that opens the current modal.
- Extend [packages/web/src/components/LoginDialog.tsx](packages/web/src/components/LoginDialog.tsx) (or replace with a small auth "hub") so the same modal/sheet has:
  - **Sign In** (current form): email + password, `signIn`, on success close and `onSuccess()`.
  - **Sign Up**: link/button "Create account" that switches to a sign-up form: email, password, confirm password; call `signUp({ username: email, password, options: { userAttributes: { email } } })`. Show message "Check your email for a confirmation code" and a "Confirm" form: email + code; call `confirmSignUp({ username: email, confirmationCode: code })`, then switch back to Sign In or auto sign-in if supported.
  - **Forgot password**: link "Forgot password?" that switches to a step 1 form (email only); call `resetPassword({ username: email })`; show "Check your email for a code" and step 2: email + code + new password; call `confirmResetPassword({ username: email, confirmationCode: code, newPassword })`; then switch back to Sign In.
- Use `aws-amplify/auth`: `signUp`, `confirmSignUp`, `resetPassword`, `confirmResetPassword` (Amplify v6 names). Ensure Cognito User Pool is configured to send email for confirmation and password reset.

**2.2 Landing page**

- On [packages/web/src/pages/LandingPage.tsx](packages/web/src/pages/LandingPage.tsx), the main CTA can stay "Get started — Log in"; opening the dialog then shows Sign In with links to "Create account" and "Forgot password?" so sign-up and forgot-password are reachable from the main login surface.

---

## 3. Frontend: First-time onboarding

**3.1 When to show onboarding**

- In [packages/web/src/App.tsx](packages/web/src/App.tsx), after `user` is set and profile is loaded (`usersApi.getMe()`), check `profile?.onboardingCompletedAt == null`. If true, render an **onboarding flow** instead of the main app (dashboard). The onboarding flow is a small wizard (or full-screen steps) that:
  1. Equipment step (optional; see below) — defines "My Gym" equipment or skip (= all equipment).
  2. Goals step (optional, can skip) (see below)
  3. "Get started" step that directs them to the "+" button (see below)
  and at the end creates "My Gym" (if not already created), sets it as default via `usersApi.patchMe({ defaultGymId, onboardingCompletedAt: new Date().toISOString() })`, and then shows the main app (e.g. dashboard).

**3.2 Equipment step (optional; "My Gym" with default = all equipment)**

- This step is **optional**. If the user skips it, create **"My Gym"** with **all six** equipment types (default = full equipment). If they complete it, "My Gym" is created with the selected equipment only.
- Define six equipment categories as constants: `dumbbells`, `free_weights`, `cables`, `weight_rack`, `cardio`, `machines`.
- Modal (or step) with:
  - Six **cards** (one per category); each card is selectable (toggle). Selected categories become `equipmentTypes` for the new gym "My Gym."
  - **Quick presets** (button row similar to push/pull/legs on the workout builder):
    - **Commercial Gym**: all six.
    - **Home Gym**: Dumbbells, Free Weights, Cardio.
    - **Minimalist**: Dumbbells only.
  - User can apply a preset then toggle individual cards to adjust.
  - Buttons: **Skip** (do not show equipment selection; at end of onboarding create "My Gym" with all six and set as default), **Next** (store selection in local state; at end of onboarding create "My Gym" with that selection and set as default).
- Persist only when onboarding completes: call `POST /users/me/gyms` with name `"My Gym"` and the chosen `equipmentTypes` (or all six if skipped), then `PATCH /users/me` with `defaultGymId` and `onboardingCompletedAt`.

**3.3 Goals step (optional)**

- Screen with short copy: "Describe your fitness goals in a few words (optional). We'll turn them into trackable goals."
- Textarea for free text; **Skip** and **Create goals** (or "Next").
- If they click **Create goals** and entered text:
  - Call the new **suggest goals** API with the free text.
  - Show a simple list of suggested goals (title, target, timeframe) with checkboxes; user can uncheck any they don't want.
  - On confirm, call `goalsApi.create` for each selected suggestion.
- If they click **Skip**, no API call; move to next step.
- Then **Next** to the final "Get started" step.

**3.4 "Get started" / guide to "+" button**

- Final onboarding step: short message like "You're all set. Tap the **+** button below to create your first workout."
- **Done** (or "Go to dashboard") button that:
  - Creates "My Gym" via `POST /users/me/gyms` (name `"My Gym"`, equipmentTypes from equipment step or all six if skipped), then calls `usersApi.patchMe({ defaultGymId: <newGymId>, onboardingCompletedAt: new Date().toISOString() })`.
  - Switches app to show the main UI (dashboard).
- Optional but recommended: on the **first time** the dashboard is shown after onboarding, show a one-time **coach mark** or tooltip that highlights the floating "+" button (e.g. a semi-transparent overlay with a cutout around the FAB and a short message "Tap here to start a workout"). Store in local state or a small flag (e.g. `localStorage` key like `workout_fab_guided`) so it only shows once. Dismissing it (or tapping the FAB) sets the flag and removes the overlay.

---

## 4. Data flow summary

```mermaid
sequenceDiagram
  participant User
  participant App
  participant Cognito
  participant API
  participant GoalsAILambda
  participant Bedrock

  User->>App: Open app (not logged in)
  App->>User: Landing + Login dialog (Sign in / Sign up / Forgot password)
  User->>Cognito: signUp / confirmSignUp or resetPassword / confirmResetPassword
  User->>Cognito: signIn
  App->>API: GET /users/me
  API-->>App: profile (onboardingCompletedAt = undefined)

  App->>User: Show onboarding: Equipment (optional) -> Goals (optional) -> "Tap + to start"
  User->>App: Optionally select equipment; optionally enter goals text
  App->>API: POST /goals/me/suggest (if goals text)
  API->>GoalsAILambda: freeText
  GoalsAILambda->>Bedrock: Parse free text to goal suggestions
  Bedrock-->>GoalsAILambda: Suggested goals
  GoalsAILambda-->>App: Suggestions
  App->>API: POST /goals/me for each selected
  App->>API: POST /users/me/gyms (My Gym, equipmentTypes)
  App->>API: PATCH /users/me (defaultGymId, onboardingCompletedAt)
  App->>User: Dashboard + one-time FAB coach mark
```

---

## 5. File and route checklist

| Area | Action |
|------|--------|
| [packages/lambdas/shared/src/models.ts](packages/lambdas/shared/src/models.ts) | Add `Gym` interface; add `defaultGymId?: string`, `onboardingCompletedAt?: string` to `UserProfile`; add `gymId?: string`, `gymName?: string` to `WorkoutInstance` |
| New Lambda: **gyms** (or extend user Lambda) | Implement GET/POST/PATCH/DELETE for `/users/me/gyms` and `/users/me/gyms/:gymId`; store gyms with PK=USER#userId, SK=GYM#gymId |
| [packages/lambdas/user/src/index.ts](packages/lambdas/user/src/index.ts) | Add `defaultGymId`, `onboardingCompletedAt` to `toMeProfile` and to PATCH `allowed` list |
| New Lambda: **GoalsAILambda** | Single handler: POST body `{ freeText }` -> Bedrock -> JSON array of goal suggestions; no DB writes |
| CDK [packages/cdk/lib/repwise-stack.ts](packages/cdk/lib/repwise-stack.ts) | Add Gyms Lambda + routes for `/users/me/gyms`; add GoalsAILambda + route `POST /goals/me/suggest`; grant Bedrock to GoalsAILambda only |
| Workout Lambda + AI Lambda | Accept `gymId` / `gymName` (and equipmentTypes from selected gym) when creating/generating workout; persist `gymId`, `gymName` on WorkoutInstance |
| [packages/web/src/api/users.ts](packages/web/src/api/users.ts) | Extend `patchMe` with `defaultGymId`, `onboardingCompletedAt`; add `gymsApi`: list, create, update, delete, setDefault (via patchMe) |
| [packages/web/src/api](packages/web/src/api) | Add `goalsApi.suggestFromText(freeText)` calling `POST /goals/me/suggest` |
| [packages/web/src/components/LoginDialog.tsx](packages/web/src/components/LoginDialog.tsx) | Add Sign up form + confirm; Forgot password + confirm; keep Sign in as default view |
| [packages/web/src](packages/web/src) | New onboarding: equipment step (optional, "My Gym"), goals step, "tap +" step; on done create My Gym + patchMe(defaultGymId, onboardingCompletedAt) |
| [packages/web/src/features/profile](packages/web/src/features/profile) | Gyms section: list gyms, add gym (name + equipment), edit gym, set default (model on profile) |
| [packages/web/src/features/workoutBuilder](packages/web/src/features/workoutBuilder) | Gym dropdown (default gym pre-selected); pass selected gym into AI request and when creating workout instance |
| [packages/web/src/features/dashboard](packages/web/src/features/dashboard) | Optional: one-time coach mark / tooltip for FAB using localStorage |

---

## 6. Equipment and preset constants (frontend)

- Categories (exact values for `equipmentTypes` on a Gym): `dumbbells`, `free_weights`, `cables`, `weight_rack`, `cardio`, `machines`.
- Presets (for onboarding and profile "Add gym"):
  - Commercial Gym: all six.
  - Home Gym: `['dumbbells','free_weights','cardio']`.
  - Minimalist: `['dumbbells']`.
- If the app filters exercises by gym equipment, align these values with the exercise catalog (existing [packages/web/src/api/exercises.ts](packages/web/src/api/exercises.ts) has `equipment` in filters).

---

## 7. Edge cases

- **Profile fetch fails (e.g. 404)**: Treat as first-time and show onboarding; backend will need to support creating or upserting profile on first PATCH if you don't create it in post-confirm (currently post-confirm creates profile, so 404 shouldn't happen for confirmed users).
- **User skips equipment**: Create "My Gym" with **all six** equipment types and set as default; no separate "no filter" state.
- **Goals suggestion fails**: Show error, allow user to skip or retry; do not block onboarding completion.
- **Cognito confirmation**: Sign-up must use email verification (or SMS if configured); document that users must confirm before they can sign in.
- **No default gym**: If `defaultGymId` is missing (e.g. legacy user), workout builder can show "No gym selected" and either create "My Gym" with all equipment on first use or require the user to set a default gym from profile.
