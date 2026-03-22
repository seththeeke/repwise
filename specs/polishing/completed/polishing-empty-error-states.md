# Empty & Error States

## Goal

Replace plain "no data" messages with illustrated empty states, surface friendly error messages instead of raw API errors, handle offline/connection loss, validate forms inline, add network retry with backoff, and show input length limits with feedback.

**Reference:** [polishing-ideas.md](./polishing-ideas.md) — Empty & Error States section

---

## Current State

| Item | Status |
|------|--------|
| **EmptyState component** | `packages/web/src/components/ui/EmptyState.tsx` exists but is **not used** |
| **Empty state locations** | WorkoutsHistoryPage, GoalsPage, FeedPage, RecentWorkoutsWidget, ActivityFeedWidget, GoalsWidget, ExerciseMetricsList — all use ad-hoc `<p className="text-gray-500">No X yet.</p>` |
| **Error handling** | Per-page inline errors; no ErrorBoundary; no global API interceptor |
| **Offline** | Not handled; failed requests surface as errors |
| **Form validation** | LoginDialog has password rules; most forms validate on submit |
| **Network retry** | No automatic retry with backoff |
| **Input length limits** | No character counters or visible limits |

---

## Key Decisions

- **Empty states:** Use Lucide icons (Dumbbell, Target, Calendar, etc.) + existing `EmptyState` component; no custom illustrations
- **Error messages:** Never show raw API errors or stack traces; use "Something went wrong — try again" with retry button
- **Offline:** Global banner at top of app when `navigator.onLine === false`; show "You're offline" and disable/queue actions
- **Form validation:** Validate as user types where feasible (email format, password match, required fields)
- **Retry:** Axios/fetch interceptor with exponential backoff (e.g. 3 retries) before surfacing error
- **Input limits:** Character counter on fields with max length (e.g. display name, goal description)

---

## Implementation Checklist

### Illustrated Empty States

- [ ] Wire `EmptyState` with `icon`, `heading`, `subtext` (and optional CTA) to:
  - [ ] WorkoutsHistoryPage — icon: Dumbbell or Calendar; "No workouts yet" + "Log your first workout"
  - [ ] GoalsPage — icon: Target; "No goals yet" + "Create one to get started" + Add button
  - [ ] FeedPage — icon: Activity or Users; "No activity yet" + "Complete workouts to see your feed"
  - [ ] RecentWorkoutsWidget — "No workouts yet" + link to new workout
  - [ ] ActivityFeedWidget — "No activity yet"
  - [ ] GoalsWidget — "No goals yet" + link to add goal
  - [ ] ExerciseMetricsList — "No exercise history yet" + "Complete workouts to see metrics"
- [ ] Ensure `EmptyState` supports optional `action` (button/link) for CTAs

### Friendly Error Messages

- [ ] Add React Error Boundary wrapping main app content
- [ ] Error Boundary UI: "Something went wrong" + "Try again" button (reload or reset state)
- [ ] API error handling: Replace raw error display with friendly message + retry
- [ ] Ensure Dashboard, Goals, Feed, WorkoutDetail, etc. use consistent error copy
- [ ] Log errors to console (or future Sentry) for debugging; never expose to user

### Offline / No Connection

- [ ] Add `useOnlineStatus()` or similar hook using `navigator.onLine` + `online`/`offline` events
- [ ] Render global banner when offline: "You're offline. Some features may not work."
- [ ] Optionally: queue mutations and sync when back online (more complex; can defer)
- [ ] Prevent or disable save/submit when offline; show toast or inline message

### Form Validation Inline

- [ ] LoginDialog: Validate email format on blur or debounced; password match on change
- [ ] Edit profile: Validate display name length, email format as user types
- [ ] Add goal: Validate goal description length, required fields
- [ ] Search/filter fields: No block; validate only where submission can fail

### Network Retry Logic

- [ ] Add axios interceptor (or fetch wrapper) for retry on 5xx and network errors
- [ ] Retry with exponential backoff: 1s, 2s, 4s (or similar); max 3 retries
- [ ] Do not retry 4xx (client errors)
- [ ] After max retries, surface friendly error to user

### Input Length Limits with Feedback

- [ ] Display name: Show "X / 50" or similar when near limit
- [ ] Goal description: Character counter if max length exists
- [ ] AI prompt: Character counter if limited
- [ ] Any text field with backend-enforced limit should show counter
- [ ] Prevent submission when over limit; show inline error

---

## Files to Modify

| Area | Files |
|------|-------|
| Empty states | `packages/web/src/components/ui/EmptyState.tsx`; WorkoutsHistoryPage, GoalsPage, FeedPage, widgets |
| Error boundary | New `packages/web/src/components/ErrorBoundary.tsx`; wrap in `App.tsx` |
| API client | `packages/web/src/api/client.ts` (retry interceptor) |
| Offline | New hook `useOnlineStatus`; banner in `App.tsx` or layout |
| Form validation | `LoginDialog.tsx`, `EditProfileSheet.tsx`, goal add modal, etc. |
| Input limits | Components with max-length fields |
