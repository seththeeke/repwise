# Analytics & Observability

## Goal

When the team decides to add analytics and observability, this spec outlines the options and checklist for: product analytics, crash reporting (iOS), error logging (web), and performance monitoring.

**Reference:** [polishing-ideas.md](./polishing-ideas.md) — Analytics & Observability section

**Status: DEFERRED.** No analytics for now. Implement when product/marketing needs justify it.

---

## Current State

| Item | Status |
|------|--------|
| **Product analytics** | Not implemented |
| **Crash reporting** | Not implemented (iOS) |
| **Error logging** | Not implemented (web); backend uses CloudWatch |
| **Performance monitoring** | Not implemented |

---

## Key Decisions (When Implemented)

- **Product analytics:** Mixpanel, Amplitude, or Firebase Analytics for screen views, feature usage, drop-off
- **Crash reporting (iOS):** Firebase Crashlytics or Sentry
- **Error logging (web):** Sentry or similar for JS errors in production
- **Performance:** API response time tracking, bundle size audits, slow screen detection

---

## Implementation Checklist (Placeholder)

### Product Analytics

- [ ] Choose provider: Mixpanel, Amplitude, Firebase Analytics, or PostHog
- [ ] Add SDK to web app; initialize with env-based API key
- [ ] Track: Screen views (route changes), key actions (workout started, workout completed, goal created)
- [ ] Track: Funnel (signup → first workout → retention)
- [ ] Respect privacy: no PII in event payloads unless necessary; cookie consent if required
- [ ] Document events and properties in team wiki or code comments

### Crash Reporting (iOS)

- [ ] Add Firebase Crashlytics or Sentry SDK to iOS app
- [ ] Configure dSYM upload for symbolication
- [ ] Test crash capture in dev build
- [ ] Set up alerts for new crashes
- [ ] Ensure no sensitive data in crash reports

### Error Logging (Web)

- [ ] Add Sentry (or equivalent) to web app
- [ ] Capture unhandled JS errors
- [ ] Capture unhandled promise rejections
- [ ] Add breadcrumbs for user actions (navigation, API calls)
- [ ] Filter out noisy errors (e.g. ad blockers, browser extensions)
- [ ] Set up alerts for error rate spikes

### Performance Monitoring

- [ ] Track API response times (e.g. p50, p95) via backend or client
- [ ] Bundle size audit: `source-map-explorer` or similar for web
- [ ] Monitor Core Web Vitals (LCP, FID, CLS) if using analytics that supports it
- [ ] Profile cold start on iOS with Instruments; target < 2s
- [ ] Document baseline and regression alerts

---

## Files to Modify (When Implemented)

| Area | Files |
|------|-------|
| Web analytics | `main.tsx`, route components, API client |
| iOS crash | `ios/App`, Capacitor config, Xcode |
| Web errors | `main.tsx`, ErrorBoundary, API client |
| Performance | Build scripts, CDK, API Gateway/Lambda metrics |
