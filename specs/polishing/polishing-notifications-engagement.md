# Notifications & Engagement

## Goal

Improve retention through push notifications, workout reminders, streak-at-risk alerts, and weekly summaries. Ensure permission request timing is respectful.

**Reference:** [polishing-ideas.md](./polishing-ideas.md) — Notifications & Engagement section

---

## Current State

| Item | Status |
|------|--------|
| **Push notifications** | Not implemented |
| **Permission timing** | N/A |
| **Workout reminders** | Not implemented |
| **Streak tracking** | Implemented: backend (metrics-processor), StreakWidget in UI |
| **Streak-at-risk notification** | Not implemented |
| **Weekly summary** | Not implemented |

---

## Key Decisions

- **Permission timing:** Ask for push permission after first completed workout, not on first launch
- **Workout reminders:** User-configurable time and recurrence (e.g. weekdays 6pm)
- **Streak-at-risk:** If user hasn't worked out today and it's evening, send "Don't break your streak!" push
- **Weekly summary:** In-app or push; Sunday/Monday recap of volume, sessions, PRs
- **Streak:** Already implemented; extend with notifications

---

## Implementation Checklist

### Push Notification Infrastructure (iOS)

- [ ] Add Capacitor Push plugin (e.g. `@capacitor/push-notifications`)
- [ ] Configure FCM (Firebase Cloud Messaging) or APNs
- [ ] Backend: Store device tokens per user; endpoint to send push
- [ ] Register device on app launch (after user is logged in)
- [ ] Handle notification tap: deep link to relevant screen (workout, goals, etc.)

### Permission Request Timing

- [ ] Do not ask on first app launch
- [ ] Ask after user completes first workout (e.g. on "Workout complete" screen or next dashboard load)
- [ ] Copy: "Get workout reminders and streak alerts?" with Allow / Not Now
- [ ] If Not Now: show in Settings later; don't nag repeatedly
- [ ] Track whether user has been asked; don't ask again if declined

### Workout Reminder Notifications

- [ ] Backend: Store user preference (enabled, time, recurrence)
- [ ] Recurrence options: Daily, Weekdays, Custom (e.g. Mon/Wed/Fri)
- [ ] UI: Settings or Profile → "Reminders" — time picker + recurrence
- [ ] Backend cron or scheduled Lambda: at configured time, send push to users with reminder enabled
- [ ] Payload: "Time for your workout!" or similar

### Streak-at-Risk Notification

- [ ] Logic: User has streak > 0; no workout today; time is past threshold (e.g. 6pm local)
- [ ] Backend: Daily job (e.g. 7pm UTC) or per-timezone; query users matching criteria
- [ ] Push: "You're on a X-day streak! Log a quick workout to keep it going."
- [ ] Don't send if user has already worked out (check completedAt for today)
- [ ] Don't send if user disabled streak notifications

### Weekly Summary

- [ ] In-app: New "Weekly Summary" section or modal on Dashboard (Sunday/Monday)
- [ ] Content: Workouts completed, total volume, PRs set, streak status
- [ ] Push option: "Your week in review: 4 workouts, 12,500 lbs lifted"
- [ ] Backend: Aggregate last 7 days; send to users who opted in
- [ ] Timing: Sunday evening or Monday morning (user preference if possible)

### Additional Engagement

- [ ] Rest day suggestions: If user has worked out many days straight, optional "Consider a rest day" (low priority)
- [ ] Goal progress: "You're 80% to your goal!" — optional
- [ ] Friend activity: "X just completed a workout" — if social features expanded

---

## Files to Modify

| Area | Files |
|------|-------|
| Push setup | `packages/web` (Capacitor), `packages/cdk` (FCM/APNs if needed) |
| Device registration | API route to store token; call from app after login |
| Settings UI | Reminder preferences, notification toggles |
| Backend | Lambdas or cron for reminder, streak-at-risk, weekly summary |
| Deep linking | Handle notification tap → navigate to workout/dashboard |
| Metrics | Reuse existing streak, workouts, goals data |
