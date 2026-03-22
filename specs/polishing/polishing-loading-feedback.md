# Loading States & Feedback

## Goal

Replace blank content areas with skeleton screens, add loading states to buttons, provide haptic feedback on key actions (iOS), wire toast confirmations, enable pull-to-refresh (iOS), use optimistic UI where appropriate, and show progress indicators on long operations.

**Reference:** [polishing-ideas.md](./polishing-ideas.md) — Loading States & Feedback section

---

## Current State

| Item | Status |
|------|--------|
| **Spinner** | `packages/web/src/components/ui/Spinner.tsx` — used widely for full-page loading |
| **Skeleton** | `packages/web/src/components/ui/Skeleton.tsx` exists but is **not used** |
| **Button loading** | `packages/web/src/components/ui/Button.tsx` has `loading` prop; **no callers** use it |
| **Toast** | `packages/web/src/components/ui/Toast.tsx` + `toastStore.ts`; `ToastContainer` only on `DashboardPage`; `addToast()` **never called** |
| **Haptics** | Not implemented |
| **Pull-to-refresh** | Not implemented |
| **Optimistic UI** | Not implemented — e.g. logging a set waits for API |
| **Progress indicators** | Spinners only; no progress bar or percentage for long ops |

---

## Key Decisions

- **Skeletons:** Use existing `Skeleton` component; wire into Dashboard, WorkoutsHistoryPage, GoalsPage, FeedPage, ExerciseCatalogPage
- **Toast:** Move `ToastContainer` to `App.tsx` so it appears app-wide; add `addToast()` for "Workout saved", "Set logged", "Goal created", etc.
- **Button loading:** Use `loading` prop on primary actions (Save, Log workout, Start workout)
- **Haptics:** Capacitor Haptics plugin; light impact on set complete, PR logged, workout finished
- **Rest timer:** Separate spec ([polishing-fitness-specific.md](./polishing-fitness-specific.md)); audio/haptic when rest ends

---

## Implementation Checklist

### Skeleton Screens

- [ ] Dashboard: Replace initial `Dumbbell animate-spin` with skeleton layout for stats, widgets, feed
- [ ] WorkoutsHistoryPage: Skeleton rows for workout list while loading
- [ ] GoalsPage: Skeleton cards for goals
- [ ] FeedPage: Skeleton for feed items
- [ ] ExerciseCatalogPage: Skeleton for exercise list
- [ ] ExerciseMetricsList: Skeleton for metrics list
- [ ] Reuse `Skeleton`; consider variant for "shimmer" if desired (animate-pulse already present)

### Button Loading States

- [ ] Log set / complete set: `loading` while API in flight
- [ ] Start workout: `loading` while creating workout
- [ ] Save workout: `loading` on finish
- [ ] Add goal: `loading` in modal
- [ ] AI Generate: Already has loading UI; verify no double-tap
- [ ] Edit profile save: `loading` on submit
- [ ] LoginDialog: Already uses Loader2; consider `Button` with `loading` for consistency

### Toast Confirmations

- [ ] Move `ToastContainer` from `DashboardPage` to `App.tsx` (inside Router, below main content)
- [ ] Add `addToast({ type: 'success', message: 'Set logged' })` when set is saved
- [ ] Add `addToast({ type: 'success', message: 'Workout saved' })` on workout complete
- [ ] Add `addToast({ type: 'success', message: 'Goal created' })` on goal add
- [ ] Add toast for PR logged (e.g. "New PR: Bench Press 185 lbs")
- [ ] Add toast for errors where appropriate (e.g. "Failed to save — try again")
- [ ] Ensure toast store is imported and used in execution flow, goals, profile

### Haptic Feedback (iOS)

- [ ] Add `@capacitor/haptics` (or equivalent)
- [ ] On set complete: light impact
- [ ] On workout finish: medium or success pattern
- [ ] On PR logged: success pattern
- [ ] On rest timer end: notification pattern
- [ ] Guard with `useIsNativeApp()` — no haptics on web

### Pull-to-Refresh (iOS)

- [ ] Use CSS `overscroll-behavior` or Capacitor pull-to-refresh
- [ ] Apply to: Dashboard, WorkoutsHistoryPage, FeedPage, GoalsPage
- [ ] Trigger `refetch()` or equivalent for the page's data

### Optimistic UI

- [ ] Log set: Update local state immediately; revert on API error + show toast
- [ ] Skip set: Same pattern
- [ ] Reorder exercises in builder: Already local; ensure API failure is handled
- [ ] Add/remove exercise in builder: Optimistic update with rollback on error

### Progress Indicators on Long Operations

- [ ] AI workout generation: Show progress steps (e.g. "Finding exercises...", "Building workout...") — may already exist
- [ ] Data import (if added later): Progress bar
- [ ] Sync operations: Percentage or step indicator instead of spinner only

---

## Files to Modify

| Area | Files |
|------|-------|
| Layout | `packages/web/src/App.tsx` (ToastContainer) |
| Dashboard | `packages/web/src/features/dashboard/DashboardPage.tsx` |
| Workouts | `packages/web/src/features/workout/WorkoutsHistoryPage.tsx` |
| Goals | `packages/web/src/features/goals/GoalsPage.tsx` |
| Feed | `packages/web/src/features/feed/FeedPage.tsx` |
| Exercise catalog | `packages/web/src/features/exerciseCatalog/ExerciseCatalogPage.tsx` |
| Execution | `packages/web/src/features/workoutExecution/*` (set log, haptics) |
| Toast usage | Any component that performs user actions (execution, goals, profile) |
| Haptics | New util or hook; `packages/web/src/hooks/useHaptics.ts` (native-only) |
