# App Cleanup & Workout Builder / Execution Feedback

## Goal

Polish the AI workout generation UI, manual builder copy, review-to-manual handoff, and workout executor affordances (skip, cancel modal, quick weight adjust). All items are **frontend-only** changes in `packages/web`.

**Related:** Timer persistence and lock screen / Dynamic Island are covered in [dynamic-island-spec.md](./dynamic-island-spec.md).

---

## Current State

| Area | Issue |
|------|--------|
| **AI SSE progress** | Completed steps use `line-through` on labels; checkmark alone is enough |
| **Post-AI review** | No path to manual builder with the same exercise list for easier overrides |
| **Manual select screen** | Bottom bar says "Start Workout" but next step is review, not execution |
| **Review screen** | Correctly says "Start Workout" before the executor — keep as-is |
| **Skip control** | Icon-only (`SkipForward`); not obviously "Skip" |
| **Cancel modal** | Uses shared `Modal` with bottom-sheet behavior on small viewports; clips or feels wrong vs centered "Complete workout" dialog |
| **Weight quick add** | Only `+5`, `+10`, `+25`, `+45`; no quick correction for mistakes |

---

## Key Decisions

- **AI progress:** Remove `line-through` from step labels when `done`; retain checkmark and muted styling.
- **Review → manual:** Secondary CTA (e.g. "Edit in manual builder") preserves `draft.exercises`, sets `WorkoutSource.MANUAL`, navigates to `/workout/new/manual`.
- **Copy:** `SelectExercisesScreen` fixed bar → **"Finalize Workout"**; `ReviewWorkoutScreen` fixed bar → **"Start Workout"** (unchanged).
- **Skip:** Show visible **"Skip"** text; maintain ~44pt minimum tap target on iOS.
- **Cancel modal:** Center alignment on mobile (same pattern as complete-workout overlay), via `Modal` variant or dedicated centered markup.
- **Weight:** Add **-5** quick button with floor at `0` (or product-defined minimum).

---

## Implementation Checklist

### 1. AI generation progress (no strikethrough)

- [x] In `AIWorkoutScreen.tsx`, remove `line-through` from completed step labels; keep check + gray text.

### 2. Review → manual builder

- [x] On `ReviewWorkoutScreen`, add button to open manual builder with current draft exercises.
- [x] Set draft `source` to `MANUAL` while preserving exercises, gym, permissions as appropriate.
- [x] Navigate to `/workout/new/manual` (`SelectExercisesScreen` reads `workoutDraftStore`).

### 3. Copy: Finalize vs Start

- [x] `SelectExercisesScreen`: change bottom bar from "Start Workout" to **"Finalize Workout"** (keep navigation to `/workout/review`).
- [x] `ReviewWorkoutScreen`: keep **"Start Workout"** on the bar that creates the workout and enters execution.

### 4. Skip control

- [x] `ExecutionHeader`: replace icon-only skip with labeled control showing **Skip** (and optional icon), accessible target size.

### 5. Cancel workout modal

- [x] Extend `Modal` with a **center** variant (or reuse centered overlay pattern from complete confirm in `WorkoutExecutionPage`).
- [x] `CancelWorkoutModal`: use centered layout on all breakpoints so it matches "Complete Workout?" and fits on screen.

### 6. Weight quick adjust -5

- [x] `WeightEntryCard`: add **-5** control (second row or extended row); clamp so weight does not go below `0`.

---

## Files to Modify

| File | Changes |
|------|---------|
| [packages/web/src/features/workoutBuilder/AIWorkoutScreen.tsx](packages/web/src/features/workoutBuilder/AIWorkoutScreen.tsx) | Remove strikethrough on progress steps |
| [packages/web/src/features/workoutBuilder/ReviewWorkoutScreen.tsx](packages/web/src/features/workoutBuilder/ReviewWorkoutScreen.tsx) | Manual-builder CTA; confirm "Start Workout" copy |
| [packages/web/src/features/workoutBuilder/SelectExercisesScreen.tsx](packages/web/src/features/workoutBuilder/SelectExercisesScreen.tsx) | "Finalize Workout" label |
| [packages/web/src/stores/workoutDraftStore.ts](packages/web/src/stores/workoutDraftStore.ts) | Only if draft updates need helpers for source switch |
| [packages/web/src/features/workoutExecution/ExecutionHeader.tsx](packages/web/src/features/workoutExecution/ExecutionHeader.tsx) | Skip label |
| [packages/web/src/components/ui/Modal.tsx](packages/web/src/components/ui/Modal.tsx) | Optional `variant` / alignment |
| [packages/web/src/features/workoutExecution/CancelWorkoutModal.tsx](packages/web/src/features/workoutExecution/CancelWorkoutModal.tsx) | Wire centered modal |
| [packages/web/src/features/workoutExecution/WeightEntryCard.tsx](packages/web/src/features/workoutExecution/WeightEntryCard.tsx) | -5 quick adjust |

---

## References

- iOS tap targets: [polishing-ios-specific.md](./polishing/polishing-ios-specific.md)
- Accessibility: [polishing-accessibility.md](./polishing/polishing-accessibility.md)
