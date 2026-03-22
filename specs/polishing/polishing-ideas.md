# Fitness App Polish Checklist
> Items that take a product from prototype to professional — covering both the iOS app and the website.

**Platform tags:** `[both]` = iOS app + website · `[iOS]` = app only · `[web]` = website only

---

## 🔐 Authentication & Security

- [ ] **Face ID / Touch ID login** `[iOS]` — Use the LocalAuthentication framework. Should be the default prompt on return visits, not buried in settings.
- [ ] **Stay logged in / persistent sessions** `[both]` — Users shouldn't re-enter passwords on every app open. Use Keychain for secure token storage on iOS; httpOnly cookies or secure localStorage on web.
- [ ] **Sign in with Apple** `[iOS]` — Required by App Store if you support any third-party login. Also significantly reduces signup friction.
- [ ] **Google Sign-In** `[both]` — A widely expected option that reduces sign-up abandonment.
- [ ] **Forgot password flow** `[both]` — The email link must work, land on a polished reset page, and expire after use.
- [ ] **Session timeout with graceful re-auth** `[both]` — Don't drop users on a blank screen or error. Intercept expired tokens and prompt re-login cleanly.
- [ ] **Email verification on signup** `[both]` — Confirm email addresses are real before letting users fully into the app.
- [ ] **Account deletion option** `[both]` — Required for App Store compliance. Users must be able to delete their account and data.

---

## ✨ Loading States & Feedback

- [ ] **Skeleton screens instead of blank content areas** `[both]` — Blank space or abrupt pop-ins feel unfinished. Shimmer placeholders make loading feel intentional.
- [ ] **Button loading states** `[both]` — A spinner or disabled state on "Save" / "Log workout" prevents double-taps and shows the action registered.
- [ ] **Haptic feedback on key actions** `[iOS]` — Completing a set, logging a PR, finishing a workout — light haptics signal success and feel satisfying.
- [ ] **Toast / snackbar confirmations** `[both]` — "Workout saved" or "Set logged" reassures the user without a modal interruption.
- [ ] **Pull-to-refresh** `[iOS]` — The expected gesture for refreshing a list. Not having it feels like a missing affordance.
- [ ] **Optimistic UI updates** `[both]` — Update the UI immediately on actions like logging a set, then reconcile with the server. Eliminates perceived lag.
- [ ] **Progress indicators on long operations** `[both]` — Importing data, generating a plan, syncing — show a progress bar or percentage, not just a spinner.

---

## ⚠️ Empty & Error States

- [ ] **Illustrated empty states** `[both]` — "No workouts yet" shouldn't be a blank screen. A small illustration + CTA ("Log your first workout") turns nothing into an invitation.
- [ ] **Friendly error messages** `[both]` — No raw API errors or stack traces visible to users. "Something went wrong — try again" with a retry button is the minimum.
- [ ] **Offline / no connection handling** `[both]` — Critical for a gym app where connectivity is unreliable. Show a clear offline banner and don't silently fail saves.
- [ ] **Form validation inline, not on submit** `[both]` — Catching "invalid email" after a long form fill is frustrating. Validate as the user types where possible.
- [ ] **Network retry logic** `[both]` — Automatically retry failed requests with exponential backoff before surfacing an error to the user.
- [ ] **Input length limits with feedback** `[both]` — Character counters on text fields that have limits. Hitting a hidden max silently is confusing.

---

## 📱 iOS-Specific Polish

- [ ] **Safe area / notch handling** — Content behind the home indicator bar or notch is a dead giveaway of an unfinished app. Use `safeAreaInsets` everywhere.
- [ ] **Keyboard avoidance** — Input fields covered by the keyboard are a classic prototype smell. Use `KeyboardAvoidingView` or `ScrollView` with `keyboardDismissMode`.
- [ ] **Dynamic Type support** — Users who've set larger text in accessibility settings expect it respected. Hardcoded font sizes break this.
- [ ] **Dark mode support** — If the user's phone is in dark mode and your app snaps to all-white, it's jarring. Respect the system color scheme.
- [ ] **App icon (all required sizes)** — A placeholder or missing icon breaks the professional illusion immediately. Generate the full icon set.
- [ ] **Launch screen / splash screen** — An all-white launch screen or default gray feels like a dev build. Match your brand.
- [ ] **Swipe-back gesture** — iOS users expect the edge swipe to navigate back. Custom nav stacks sometimes break this — verify it works throughout.
- [ ] **Background app refresh / push notifications** — Workout reminders, rest timer notifications, and streak nudges add perceived value and retention.
- [ ] **App Store screenshots** — Before wider sharing, having polished screenshots (even just 3-4) makes the listing look intentional.
- [ ] **Landscape / orientation handling** — Either support rotation gracefully or lock to portrait explicitly. Unhandled rotation breaks layouts.
- [ ] **iPad layout** — If your app scales up to iPad via universal binary, verify it doesn't just stretch a phone layout to fill the screen.
- [ ] **Share sheet integration** — Sharing a workout summary, a PR, or a progress photo via iOS share sheet is a natural social hook.
- [ ] **Spotlight search indexing** — Register workout names and exercises with `NSUserActivity` so they appear in Spotlight.
- [ ] **Widget support** — A home screen widget showing today's workout or a streak counter adds engagement with minimal effort via WidgetKit.

---

## 🌐 Website-Specific Polish

- [ ] **Responsive layout at all breakpoints** — Test at 375px (mobile), 768px (tablet), and 1440px (desktop). A broken mobile layout is immediately disqualifying.
- [ ] **Page title and favicon** — A browser tab reading "React App" or showing a blank icon signals dev build. Set both for every route.
- [ ] **404 page** — Users will hit bad URLs. A branded 404 with navigation home is table stakes.
- [ ] **SEO basics on the landing page** — Meta title, description, and `og:image` for link sharing. Easy to add now, hard to retrofit later.
- [ ] **Smooth scroll behavior** — Anchor links that jump vs `scroll-behavior: smooth` — a subtle but noticeable quality signal.
- [ ] **Loading state on initial page load** — A blank flash before content loads (FOUC) feels unpolished. Use a loading state or SSR/SSG.
- [ ] **Accessible keyboard navigation** — Tab order, focus rings, and skip-nav links matter for accessibility and App Store / WCAG compliance.
- [ ] **`robots.txt` and `sitemap.xml`** — Basic hygiene for any public-facing site, especially once you start marketing.
- [ ] **HTTPS enforced** — Redirect all HTTP to HTTPS. A browser "Not Secure" warning is an instant trust killer.
- [ ] **Cookie / privacy banner** — Required in many jurisdictions if you use any analytics or tracking.
- [ ] **Print stylesheet** — Low effort, occasionally appreciated. Workout plans in particular are things users might print.

---

## 🎨 Visual Consistency

- [ ] **Consistent spacing scale** `[both]` — Random padding values (13px here, 17px there) feel hand-assembled. Stick to a 4pt or 8pt grid throughout.
- [ ] **Typography hierarchy** `[both]` — Title, subtitle, body, label — each visually distinct. 2-3 font weights max across the whole app.
- [ ] **Consistent button styles** `[both]` — Primary, secondary, destructive — defined and used consistently. Mixed button appearances look patchy.
- [ ] **Icon set consistency** `[both]` — Mixing SF Symbols, Material Icons, and random PNGs is noticeable. Pick one icon family and stick to it.
- [ ] **Color system with semantic tokens** `[both]` — Named colors (e.g. `--color-primary`, `--color-danger`) rather than hardcoded hex throughout. Makes theme changes trivial.
- [ ] **Consistent border radii** `[both]` — Mixing sharp corners, subtle rounding, and pill shapes across different cards/buttons looks accidental.
- [ ] **Image handling** `[both]` — Profile photos and exercise images need consistent aspect ratios, object-fit, and placeholder states while loading.
- [ ] **Animation consistency** `[both]` — Page transitions, modal entrances, and list animations should use the same easing and duration. Mismatched animations feel choppy.

---

## 🏋️ Fitness App–Specific

- [ ] **Active workout screen stays awake** `[iOS]` — Screen auto-locking mid-set is infuriating. Use `UIApplication.shared.isIdleTimerDisabled = true` during active workouts.
- [ ] **Rest timer with audio/haptic alert** `[both]` — Users look away from the screen between sets. An audio cue when rest ends is expected in any workout app.
- [ ] **HealthKit integration** `[iOS]` — Writing workouts to Apple Health makes your app feel native. Users notice when it's missing and may choose alternatives because of it.
- [ ] **Large tap targets during workouts** `[both]` — Users logging sets have sweaty hands and limited focus. Buttons need to be at least 44pt — bigger is better.
- [ ] **1RM / personal record tracking & celebration** `[both]` — Surfacing PRs with a small celebration moment (animation, confetti, notification) is high-value engagement.
- [ ] **Workout history is browsable** `[both]` — Users should be able to scroll back through past sessions easily. Calendar view or infinite scroll list.
- [ ] **Exercise search is fast and forgiving** `[both]` — Fuzzy search, common abbreviations (OHP → overhead press), and fast response time. Slow search during a workout is painful.
- [ ] **Quick-add for recent exercises** `[both]` — Surfacing the last 5-10 exercises used saves repetitive searching.
- [ ] **Volume / progress charts** `[both]` — Showing users their progress over time (total weight lifted, reps, workout frequency) is a core retention driver.
- [ ] **Plate calculator** `[both]` — A built-in tool to calculate barbell plate combinations for a target weight is a surprisingly high-value utility feature.
- [ ] **Warm-up set suggestions** `[both]` — Suggesting warm-up weights based on the working weight is a polish feature that signals expertise.
- [ ] **Notes field on sets / workouts** `[both]` — "Felt strong" or "left knee bothering me" — power users want this and its absence frustrates them.
- [ ] **Export workout data** `[both]` — CSV or PDF export of workout history. A trust signal that users own their data.

---

## ♿ Accessibility

- [ ] **Sufficient color contrast** `[both]` — WCAG AA requires 4.5:1 for normal text. Use a contrast checker on your primary color combinations.
- [ ] **Screen reader labels** `[both]` — Every icon button needs an `accessibilityLabel` (iOS) or `aria-label` (web). Unlabeled buttons are invisible to VoiceOver/TalkBack users.
- [ ] **Reduced motion support** `[both]` — Respect `prefers-reduced-motion` on web and the iOS accessibility setting. Skip or simplify animations for affected users.
- [ ] **Minimum tap target size** `[both]` — 44×44pt on iOS, 44×44px on web. Small targets frustrate all users, not just accessibility users.
- [ ] **Focus management in modals** `[web]` — When a modal opens, focus should move into it. When it closes, focus should return to the trigger element.

---

## 📊 Analytics & Observability

- [ ] **Basic analytics** `[both]` — Know which screens users visit, where they drop off, and which features they actually use. Mixpanel, Amplitude, or even Firebase are fine.
- [ ] **Crash reporting** `[iOS]` — Firebase Crashlytics or Sentry. You need to know about crashes before your users report them.
- [ ] **Error logging** `[web]` — Sentry or a similar service to capture JS errors in production. You won't find bugs you can't see.
- [ ] **Performance monitoring** `[both]` — Track API response times and slow screens. Performance regressions are easy to miss without measurement.

---

## 🚀 Performance

- [ ] **Image optimization** `[both]` — Compress images, serve WebP on web, use lazy loading. Unoptimized images are the most common performance killer.
- [ ] **API response caching** `[both]` — Exercise catalog, user profile, and workout history shouldn't be re-fetched on every navigation. Cache aggressively.
- [ ] **Pagination / infinite scroll on long lists** `[both]` — Fetching 500 exercises at once and rendering them all is slow. Paginate or virtualize.
- [ ] **App launch time** `[iOS]` — Profile cold start with Instruments. Anything over ~2 seconds feels slow. Defer non-critical work.
- [ ] **Bundle size** `[web]` — Audit your JS bundle with a tool like `source-map-explorer`. Unused dependencies and large libraries silently slow down load time.

---

## 🔔 Notifications & Engagement

- [ ] **Push notification permission request timing** `[iOS]` — Don't ask for permission immediately on first launch. Wait until the user has seen value (e.g., after their first logged workout).
- [ ] **Workout reminder notifications** `[iOS]` — User-configurable reminders ("Remind me to work out at 6pm on weekdays") drive retention significantly.
- [ ] **Streak tracking** `[both]` — A streak counter with a risk-of-losing notification is a proven engagement mechanic for fitness apps.
- [ ] **Weekly summary** `[both]` — A Sunday/Monday recap of last week's workouts (total volume, sessions, PRs) is a high-value touch point.

---

*Generated for reference during development. Items marked `[both]` apply to the React web app and the iOS app. Items marked `[iOS]` or `[web]` are platform-specific.*