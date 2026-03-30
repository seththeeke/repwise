# Auth & Security Polish

## Goal

Harden authentication and security so Repwise feels trustworthy and meets App Store requirements. Cover Face ID, persistent sessions, social sign-in, forgot-password polish, session handling, email verification UX, and account deletion.

**Reference:** [polishing-ideas.md](./polishing-ideas.md) — Authentication & Security section

---

## Current State

| Item | Status |
|------|--------|
| **Login / signup** | Cognito via Amplify v6; custom `LoginDialog` (modal + fullscreen for native) |
| **Sign-in flow** | Email + password; `authFlows: { userSrp: true }` |
| **Forgot password** | Implemented: `resetPassword` → `confirmResetPassword` → back to signin |
| **Email verification** | Cognito `autoVerify: { email: true }` in [packages/cdk/lib/auth.ts](../../packages/cdk/lib/auth.ts) |
| **Session** | `getCurrentUser()` at app load; token in `apiClient` interceptor via `fetchAuthSession()` |
| **Account deletion** | Not implemented — required for App Store |
| **Face ID / Touch ID** | Not implemented |
| **Sign in with Apple** | Not implemented — required if any third-party login exists |
| **Google Sign-In** | Not implemented |
| **Persistent sessions** | Cognito refresh tokens; behavior may vary; no explicit Keychain/localStorage handling |
| **Session timeout re-auth** | No global interceptor; expired tokens may surface as API errors |

---

## Key Decisions

- **Phase 1 (App Store compliance):** Account deletion, Sign in with Apple, Face ID / Touch ID
- **Phase 2:** Persistent sessions (Keychain on iOS, secure storage on web), session timeout with graceful re-auth
- **Phase 3:** Google Sign-In, forgot-password landing-page polish, email verification UX improvements
- **Account deletion:** Cognito `adminDeleteUser` + backend deletion of user profile, workouts, goals, metrics, feed items

---

## Implementation Checklist

### Phase 1: App Store Compliance

- [ ] **Account deletion**
  - [ ] Add API endpoint `DELETE /users/me` (or similar) to delete user + related data
  - [ ] Backend: Cognito `adminDeleteUser`, DynamoDB batch delete for user's records
  - [ ] Frontend: Settings or Profile → "Delete account" with confirmation modal
  - [ ] Ensure data export or final notice before deletion (per policy)
- [ ] **Sign in with Apple**
  - [ ] Add Apple provider to Cognito User Pool (AWS Console or CDK)
  - [ ] Capacitor: Use `@capacitor-community/apple-sign-in` or similar
  - [ ] UI: Add "Sign in with Apple" button to `LoginDialog`
  - [ ] Handle identity token and link to Cognito
- [ ] **Face ID / Touch ID**
  - [ ] Use LocalAuthentication via Capacitor plugin (e.g. `@aparajita/capacitor-biometric-auth`)
  - [ ] Store a session flag or credential hint in Keychain (via Secure Storage plugin)
  - [ ] On app launch (return visit): prompt for Face ID / Touch ID before showing main app
  - [ ] Fallback to password if biometric fails or is unavailable

### Phase 2: Session Persistence & Re-auth

- [ ] **Stay logged in**
  - [ ] iOS: Use `@capacitor/preferences` or Secure Storage for auth persistence
  - [ ] Web: Ensure Amplify persists tokens (amplify storage); consider httpOnly cookies for production
  - [ ] Verify refresh token flow works across app restarts
- [ ] **Session timeout with graceful re-auth**
  - [ ] Add API response interceptor for 401
  - [ ] On 401: clear user state, show login prompt (modal or redirect) with "Session expired — sign in again"
  - [ ] Avoid blank screen or raw error; preserve current route for post-login return

---

## Files to Modify

| Area | Files |
|------|-------|
| Auth config | `packages/cdk/lib/auth.ts`, Cognito User Pool (Apple/Google providers) |
| Login UI | `packages/web/src/components/LoginDialog.tsx` |
| Settings / profile | `packages/web/src/features/profile/SettingsPage.tsx`, `ProfilePage.tsx` |
| API / auth | `packages/web/src/api/client.ts`, `packages/web/src/App.tsx` |
| User deletion | New Lambda or API route; `packages/api` (or equivalent) |
| Biometric | Capacitor plugin; `packages/web/src/` (auth flow on native) |
