# iOS-Specific Polish

## Goal

Ensure the Repwise iOS app (Capacitor WebView) feels native: proper safe area and notch handling, keyboard avoidance, Dynamic Type, dark mode, launch screen, swipe-back, and future work for push, share sheet, Spotlight, and widgets.

**Reference:** [polishing-ideas.md](./polishing-ideas.md) — iOS-Specific Polish section

---

## Current State

| Item | Status |
|------|--------|
| **Safe area / notch** | Partial: `viewport-fit=cover` in index.html; `env(safe-area-inset-top)` in ExecutionHeader, AIWorkoutScreen, ReviewWorkoutScreen, SelectExercisesScreen, NewWorkoutScreen |
| **Keyboard** | Accessory bar hidden via `Keyboard.setAccessoryBarVisible({ isVisible: false })`; no scroll-to-input or keyboard avoidance |
| **Dynamic Type** | Not supported; hardcoded font sizes |
| **Dark mode** | Tailwind `dark:` classes present; no `prefers-color-scheme` detection — app may not respect system setting |
| **App icon** | Done: purple + "Repwise" cursive; 1024x1024 in Assets |
| **Launch screen** | Default; may be gray or white |
| **Swipe-back** | BrowserRouter history; should work in WebView; verify on device |
| **Push / background refresh** | Not implemented |
| **App Store screenshots** | Not created |
| **Landscape** | Not explicitly handled; may stretch or break |
| **iPad** | Universal binary; likely phone layout stretched |
| **Share sheet** | Not implemented |
| **Spotlight search** | Not implemented |
| **Widget** | Not implemented |

---

## Key Decisions

- **Safe area:** Audit all screens; add `paddingTop: max(1rem, env(safe-area-inset-top))` where headers exist; bottom safe area for fixed FABs
- **Keyboard:** Scroll focused input into view; consider `scroll-margin` or `scrollIntoView` on focus
- **Dynamic Type:** Support `textSize` or CSS `font-size` scaling via `@supports` or media query; may require design tokens
- **Dark mode:** Respect `prefers-color-scheme: dark`; ensure `dark` class or meta theme-color matches
- **Launch screen:** Match brand (purple, Repwise text or logo); update iOS LaunchScreen.storyboard
- **Push / Spotlight / Widgets:** Phase 2; document in this spec for later

---

## Implementation Checklist

### Safe Area (Complete Coverage)

- [ ] Audit: DashboardHeader, ProfileHeader, FeedPage, GoalsPage, WorkoutsHistoryPage, WorkoutDetailPage
- [ ] Add `paddingTop: max(1rem, env(safe-area-inset-top))` to any screen with top content
- [ ] Bottom: FAB, fixed "Start Workout" bar — ensure `paddingBottom` or `env(safe-area-inset-bottom)`
- [ ] Verify on device with notch / Dynamic Island

### Keyboard Avoidance

- [ ] On input focus: scroll element into view (e.g. `element.scrollIntoView({ behavior: 'smooth', block: 'center' })`)
- [ ] Or: use `scroll-margin-top` on inputs to prevent keyboard overlap
- [ ] Test: LoginDialog on native, weight input during workout, search fields
- [ ] Capacitor Keyboard plugin: check `Keyboard.addListener('keyboardWillShow')` for manual offset if needed

### Dynamic Type

- [ ] Document approach: use `clamp()` or `rem` for key text sizes
- [ ] Or: CSS `font-size` with `@media (prefers-contrast)` / `@media (prefers-reduced-motion)` — Dynamic Type maps to `-apple-system-body` scaling
- [ ] In WebView, system text size may not propagate; research Capacitor/Dynamic Type
- [ ] Minimum: ensure no text is unreasonably small (min 14px body)

### Dark Mode

- [ ] Set `color-scheme: light dark` in `index.html` or CSS
- [ ] Ensure `theme-color` meta updates for dark
- [ ] Tailwind `dark:` already covers most UI; verify all screens
- [ ] If user preference stored, respect it; otherwise follow system

### Launch Screen

- [ ] Edit `ios/App/App/Base.lproj/LaunchScreen.storyboard`
- [ ] Use purple background (#7c3aed) and "Repwise" text or app icon
- [ ] Avoid generic gray or white

### Swipe-Back Gesture

- [ ] Verify in iOS Simulator and on device: edge swipe goes back
- [ ] BrowserRouter + history should handle; if broken, check WebView gesture configuration

### Phase 2 (Future)

- [ ] **Push notifications:** Capacitor Push plugin; FCM/APNs setup; see [polishing-notifications-engagement.md](./polishing-notifications-engagement.md)
- [ ] **App Store screenshots:** 3–4 polished screenshots (Dashboard, workout execution, etc.)
- [ ] **Landscape:** Either lock to portrait in Info.plist or support rotation with responsive layout
- [ ] **iPad:** Test on iPad Simulator; add tablet breakpoints if needed
- [ ] **Share sheet:** `@capacitor/share` for sharing workout summary, PR
- [ ] **Spotlight:** `NSUserActivity` for indexing workouts/exercises
- [ ] **Widget:** WidgetKit for streak or today's workout

---

## Files to Modify

| Area | Files |
|------|-------|
| Safe area | ExecutionHeader, DashboardHeader, ProfileHeader, FeedPage, GoalsPage, WorkoutsHistoryPage, etc. |
| Keyboard | `packages/web/src/main.tsx`; input components |
| Dark mode | `packages/web/index.html`, `packages/web/src/index.css` |
| Launch screen | `packages/web/ios/App/App/Base.lproj/LaunchScreen.storyboard` |
| Capacitor | `capacitor.config.ts` if needed for plugins |
