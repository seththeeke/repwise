### Optimistic UI

- [ ] Log set: Update local state immediately; revert on API error + show toast
- [ ] Skip set: Same pattern
- [ ] Reorder exercises in builder: Already local; ensure API failure is handled
- [ ] Add/remove exercise in builder: Optimistic update with rollback on error

### Progress Indicators on Long Operations

- [ ] AI workout generation: Show progress steps (e.g. "Finding exercises...", "Building workout...") — may already exist
- [ ] Data import (if added later): Progress bar
- [ ] Sync operations: Percentage or step indicator instead of spinner only

### Phase 3: Social & Polish

- [ ] **Google Sign-In**
  - [ ] Add Google provider to Cognito
  - [ ] Capacitor: `@codetrix-studio/capacitor-google-auth`
  - [ ] UI: Add "Sign in with Google" to `LoginDialog`
- [ ] **Forgot password polish**
  - [ ] Ensure Cognito email link lands on a reset page (or Hosted UI) with clear UX
  - [ ] Verify reset link expires after use; show success and redirect to signin
- [ ] **Email verification UX**
  - [ ] If users see "verify your email" friction: improve messaging or post-signup flow
  - [ ] Cognito already auto-verifies; document for support