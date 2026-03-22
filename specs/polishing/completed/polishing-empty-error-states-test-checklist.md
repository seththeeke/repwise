# Empty & Error States — Test Checklist

Use this checklist to verify the implementation of [polishing-empty-error-states.md](./polishing-empty-error-states.md).

---

## Illustrated Empty States

- [ ] **WorkoutsHistoryPage** (no completed workouts)
  - Shows EmptyState with Calendar icon, "No workouts yet", subtext "Log your first workout to get started"
  - "Log your first workout" button navigates to `/workout/new`
- [ ] **GoalsPage** (no goals)
  - Shows EmptyState with Target icon, "No goals yet", "Create one to get started"
  - "Add goal" button opens the add-goal modal
- [ ] **FeedPage** (no feed items)
  - Shows EmptyState with Activity icon, "No activity yet", "Complete workouts to see your feed"
- [ ] **RecentWorkoutsWidget** on Dashboard (no workouts)
  - Shows EmptyState with Dumbbell icon, "No workouts yet"
  - "Log a workout" button navigates to `/workout/new`
- [ ] **ActivityFeedWidget** (no feed items)
  - Shows EmptyState with Dumbbell icon, "No activity yet", "Complete workouts or follow others to see activity."
- [ ] **GoalsWidget** on Dashboard (no goals)
  - Shows EmptyState with Target icon, "No goals yet", "Set a target to stay motivated"
  - "Add goal" link navigates to add goal
- [ ] **ExerciseMetricsList** (no exercise history)
  - Shows EmptyState with Dumbbell icon, "No exercise history yet", "Complete workouts to see your metrics."

---

## Error Boundary

- [ ] **Trigger a React error** (e.g. throw in a component) and confirm:
  - "Something went wrong" message appears
  - "Try again" button resets the error boundary
  - No raw stack trace or error message is shown to the user
- [ ] Error boundary wraps all app states (config, loading, logged out, onboarding, main app)

---

## Friendly Error Messages

- [ ] **Dashboard** — When API fails, shows "Something went wrong. Please try again." with "Try again" button (reloads page)
- [ ] **Goals add modal** — On create failure, shows "Something went wrong. Please try again." (not raw API error)
- [ ] **Edit profile** — On save failure, shows "Failed to save. Please try again." (already friendly)
- [ ] No raw API errors, stack traces, or technical messages visible anywhere

---

## Offline Banner

- [ ] **Go offline** (DevTools → Network → Offline, or airplane mode)
  - Amber banner appears at top: "You're offline. Some features may not work."
- [ ] **Go back online** — Banner disappears
- [ ] Banner appears regardless of auth state (logged in, logged out, onboarding)

---

## Network Retry Logic

- [ ] **Simulate 5xx** — Use DevTools Network throttling or mock a 500 response
  - Request retries up to 3 times with backoff before surfacing error
  - (Hard to test without backend; consider manual API mock)
- [ ] **Simulate network failure** — Disconnect during request; after reconnecting, retries should occur before error
- [ ] **4xx errors** — Should NOT retry (e.g. 401, 404)

---

## Inline Form Validation (LoginDialog)

- [ ] **Sign up — Email**
  - Enter invalid email (e.g. "foo"), blur → "Please enter a valid email address"
  - Enter valid email (e.g. "a@b.com"), blur → error clears
- [ ] **Sign up — Password match**
  - Type password "Test1234", confirm password "Test123" → "Passwords do not match" under confirm field
  - Fix confirm to match → error clears
  - Change password → confirm error updates
- [ ] **Submit with invalid email** — Prevents submit, shows inline email error
- [ ] **Submit with password mismatch** — Prevents submit, shows inline confirm error
- [ ] **Forgot password — Email** — Same validation; invalid email on blur shows error; submit with invalid email prevented

---

## Input Length Limits with Feedback

- [ ] **Edit profile — Display name**
  - Character counter shows "X / 50" when typing
  - At 50 chars, counter turns amber
  - Cannot exceed 50 (maxLength)
  - Submit with 51+ chars triggers "Display name must be 50 characters or less."
- [ ] **Edit profile — Bio**
  - Character counter shows "X / 200" when typing
  - At 200 chars, counter turns amber
- [ ] **Add goal — Title**
  - Character counter shows "X / 100" when typing (when length > 0)
  - At 100 chars, counter turns amber
  - Submit with 101+ chars triggers "Title must be 100 characters or less."

---

## Quick Smoke Test (Minimum)

1. Load app as new user (or with empty data)
2. Visit Workouts, Goals, Feed, Dashboard — confirm empty states render with icons and CTAs
3. Toggle network offline → confirm banner appears → back online → banner gone
4. Sign up form: invalid email + password mismatch → inline errors
5. Edit profile: type 51 chars in display name → counter and validation
6. Add goal: type 101 chars in title → counter and validation
