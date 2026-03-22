# Fitness App-Specific Polish

## Goal

Optimize Repwise for workout use: screen stays awake during execution, rest timer with presets and alert, HealthKit integration (future), large tap targets, 1RM/PR celebration, browsable history, fast exercise search, quick-add recent exercises, volume charts, plate calculator, warm-up suggestions, notes on sets/workouts, and data export.

**Reference:** [polishing-ideas.md](./polishing-ideas.md) — Fitness App-Specific section

---

## Current State

| Item | Status |
|------|--------|
| **Screen wake lock** | Not implemented; screen may dim during workout |
| **Rest timer** | Not implemented; `DurationTimerCard` exists for duration exercises (e.g. plank), not between-set rest |
| **HealthKit** | Not implemented |
| **Tap targets** | Not audited; some buttons may be < 44pt |
| **PR celebration** | PersonalRecordsWidget shows PRs; no confetti or celebration moment |
| **Workout history** | WorkoutsHistoryPage with list; calendar exists (WeekCalendarWidget) |
| **Exercise search** | Search in catalog and builder; `exercisesApi.list({ search })` |
| **Quick-add recent** | Not implemented |
| **Volume charts** | Not implemented |
| **Plate calculator** | Not implemented |
| **Warm-up suggestions** | Not implemented |
| **Notes on sets/workouts** | Not implemented |
| **Export** | Not implemented |

---

## Key Decisions

- **Rest timer:** Preset options 60s, 90s, 120s; no free input. Audio + haptic alert when rest ends. Capacitor Haptics + Web Audio API or Capacitor plugin for sound.
- **Wake lock:** Use Screen Wake Lock API (web) or Capacitor equivalent during active workout session.
- **PR celebration:** Brief confetti or success animation when user logs a new PR; use existing 1RM logic.
- **Plate calculator:** Standalone utility (modal/sheet); barbell default weight (45 lb or 20 kg) configurable.
- **HealthKit:** Phase 2; document for later implementation.
- **Notes:** Per-set and/or per-workout; lightweight text field.

---

## Implementation Checklist

### Screen Wake Lock (Active Workout)

- [ ] Use Screen Wake Lock API: `navigator.wakeLock.request('screen')` when workout starts
- [ ] Release when workout ends or user pauses
- [ ] Handle visibility change: re-request when tab/app visible again
- [ ] iOS: Capacitor plugin if Wake Lock API not supported in WebView
- [ ] Enable only during execution screen, not in builder or review

### Rest Timer

- [ ] Add rest timer UI between sets (or as optional "Start rest" button after completing set)
- [ ] Presets: 60s, 90s, 120s — user taps to start; countdown shows
- [ ] On completion: play sound (beep or short tone) + haptic (Capacitor Haptics)
- [ ] Optional: skip rest (tap "Skip" or "Next set")
- [ ] Persist last-used preset in localStorage
- [ ] UX: Show timer in execution flow; non-blocking (user can navigate or dismiss)
- [ ] Reuse or extend DurationTimerCard concept if it fits

### Large Tap Targets

- [ ] Audit: Log set button, complete set, skip, weight input, rep input
- [ ] Ensure all interactive elements >= 44x44pt (or 44px on web)
- [ ] Increase padding on small buttons; use min-h and min-w
- [ ] Especially critical during workout (sweaty hands, quick taps)

### 1RM / PR Celebration

- [ ] When user logs a weight that exceeds previous PR for that exercise: trigger celebration
- [ ] Options: confetti (canvas or library), brief success animation, toast "New PR!"
- [ ] Use existing 1RM/PR logic from metrics; detect at log time
- [ ] Keep it subtle — 1–2 second moment, not disruptive
- [ ] Consider haptic success pattern on iOS

### Workout History Browsable

- [ ] WorkoutsHistoryPage: ensure infinite scroll or pagination if list grows
- [ ] WeekCalendarWidget: completed dates; tapping opens that day's workouts
- [ ] CalendarViewModal: expand for full month view
- [ ] Ensure smooth scrolling and performance with 100+ workouts

### Exercise Search Improvements

- [ ] Fuzzy search: consider backend fuzzy match or client-side library (e.g. Fuse.js)
- [ ] Common abbreviations: OHP → overhead press; add synonym mapping or search expansion
- [ ] Fast response: debounce 150–200ms; show results as user types
- [ ] Consider prefetching exercise list on builder/review screen

### Quick-Add Recent Exercises

- [ ] Store last 5–10 exercise IDs per user (localStorage or backend)
- [ ] On "Add exercise" in builder or manual flow: show "Recent" section at top
- [ ] Tapping recent exercise adds it immediately (no search needed)
- [ ] Update recent list when user adds/completes exercise

### Volume / Progress Charts

- [ ] Add chart (e.g. Recharts, Chart.js) for volume over time
- [ ] Dashboard or dedicated Metrics page: total weight lifted, reps, workout frequency
- [ ] Weekly/monthly view; simple line or bar chart
- [ ] Data from existing metrics API

### Plate Calculator

- [ ] New modal or sheet: "Plate Calculator"
- [ ] Input: target weight (lbs or kg), barbell weight (default 45 lb)
- [ ] Output: plate combination per side (e.g. "2x 45, 1x 25" per side)
- [ ] Optional: plate inventory (user's available plates) for realistic suggestions
- [ ] Access from execution screen or as standalone tool in nav/settings

### Warm-Up Set Suggestions

- [ ] Based on working weight: suggest 1–2 warm-up sets (e.g. 50%, 75% of working weight)
- [ ] Show as optional "Add warm-up" or inline suggestion before first working set
- [ ] Rule-based: no AI; simple percentage of first working set
- [ ] Defer if complex; document as future enhancement

### Notes Field

- [ ] Per-set: optional "Notes" (e.g. "felt easy", "left knee") — expand set row or tap to add
- [ ] Per-workout: optional "Workout notes" at end (e.g. "Good session, slightly tired")
- [ ] Store in workout/set model; display in history
- [ ] Backend: add `notes` field to workout instance and/or set schema if not present

### Export Workout Data

- [ ] Add "Export" in Settings or Profile: CSV or PDF of workout history
- [ ] CSV: workout date, exercises, sets, reps, weight, duration
- [ ] PDF: formatted summary; optional
- [ ] Trust signal: users own their data
- [ ] API: endpoint to fetch user's full workout history for export

### HealthKit (Phase 2)

- [ ] Document: Capacitor HealthKit plugin or native bridging
- [ ] Write completed workouts to Apple Health (workout type, duration, exercises)
- [ ] Optional: read weight/body metrics if user grants permission
- [ ] Implement when iOS polish is prioritized

---

## Files to Modify

| Area | Files |
|------|-------|
| Wake lock | WorkoutExecutionPage or ExecutionHeader |
| Rest timer | New component; WorkoutExecutionPage |
| Tap targets | WeightEntryCard, execution controls, builder |
| PR celebration | WeightEntryCard or execution flow; PersonalRecordsWidget context |
| Search | ExerciseCatalogPage, SelectExercisesScreen; possibly backend |
| Quick-add | SelectExercisesScreen; localStorage or API |
| Charts | New Metrics or Dashboard widget; metrics API |
| Plate calculator | New component; accessible from execution or tools |
| Notes | Workout model; execution UI; WorkoutDetailPage |
| Export | New API route; Settings or Profile page |
| HealthKit | Future; Capacitor plugin |
