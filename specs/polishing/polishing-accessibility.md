# Accessibility

## Goal

Ensure Repwise meets WCAG AA where applicable: sufficient color contrast, screen reader labels on all interactive elements, reduced motion support, minimum tap target size, and proper focus management in modals.

**Reference:** [polishing-ideas.md](./polishing-ideas.md) — Accessibility section

---

## Current State

| Item | Status |
|------|--------|
| **Color contrast** | Primary (#7c3aed) on white — not audited; some gray text may fail AA |
| **Screen reader labels** | Many buttons have `aria-label`; icon-only buttons partially covered |
| **Reduced motion** | Not implemented; `prefers-reduced-motion` not respected |
| **Tap target size** | Not audited; some buttons/icons may be < 44pt |
| **Modal focus** | No focus trap; focus may not move into modal or return on close |

---

## Key Decisions

- **Contrast:** Target WCAG AA (4.5:1 for normal text, 3:1 for large); audit primary, accent, error, and gray combinations
- **Labels:** Every icon button needs `aria-label` (or `aria-labelledby`); images need `alt`
- **Reduced motion:** Respect `prefers-reduced-motion: reduce`; simplify or disable animations
- **Tap targets:** Minimum 44x44pt (iOS) / 44x44px (web) for all interactive elements
- **Modal focus:** Focus moves to first focusable element on open; returns to trigger on close; trap focus within modal

---

## Implementation Checklist

### Color Contrast

- [ ] Audit primary (#7c3aed) on white, gray-50, gray-100
- [ ] Audit gray-500, gray-600 text on white/dark backgrounds
- [ ] Use contrast checker (e.g. WebAIM) on key combinations
- [ ] Adjust primary or text colors if ratio < 4.5:1 for body text
- [ ] Ensure error (red) and success (green) text meet minimum contrast
- [ ] Document approved color pairs in design tokens

### Screen Reader Labels

- [ ] Audit all icon-only buttons: Add `aria-label` where missing
- [ ] Examples: Back, Close, Edit, Delete, Drag handle, Play, Pause, Skip
- [ ] Images: Add `alt` to any img; decorative images get `alt=""` or `aria-hidden`
- [ ] Form inputs: Associate labels with `htmlFor`/`id` or `aria-labelledby`
- [ ] Live regions: Toast/snackbar — `aria-live="polite"` so screen reader announces
- [ ] Reference existing labels: ProfileHeader, ExecutionHeader, LoginDialog, etc. have some; complete the set

### Reduced Motion

- [ ] Add media query: `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }` or targeted rules
- [ ] Or: use `prefers-reduced-motion: reduce` in JS to disable Framer Motion animations
- [ ] Ensure no essential information is conveyed only by animation
- [ ] Spinner/loading: consider static alternative for reduced-motion users

### Minimum Tap Target Size

- [ ] Audit: All buttons, icon buttons, links, form controls
- [ ] Ensure min 44x44pt (iOS) / 44x44px (web)
- [ ] Use `min-h-[44px] min-w-[44px]` or equivalent; increase padding where needed
- [ ] Grip handle, checkboxes, radio buttons, chips — all meeting minimum
- [ ] Document in visual consistency spec as well

### Focus Management in Modals

- [ ] On modal open: Move focus to first focusable element (e.g. first input or close button)
- [ ] Use `useEffect` + `ref.current?.focus()` or `autoFocus` attribute
- [ ] Focus trap: Tab cycles only within modal; never Tab to background
- [ ] On modal close: Return focus to element that opened modal (trigger button)
- [ ] Use `aria-modal="true"` and `role="dialog"` on modal container
- [ ] Escape to close: Handle `keydown` Escape to close modal
- [ ] Components: LoginDialog, EditProfileSheet, goal add modal, CalendarViewModal, etc.

### Additional Considerations

- [ ] Skip to main content link for keyboard users (see website spec)
- [ ] Heading hierarchy: Ensure h1 → h2 → h3 logical order
- [ ] Error messages: Associate with form fields via `aria-describedby` so screen reader reads them
- [ ] Loading states: `aria-busy="true"` on container; `aria-live` for status updates

---

## Files to Modify

| Area | Files |
|------|-------|
| Contrast | `index.css`, `tailwind.config.js`; component color usage |
| Labels | All icon buttons; LoginDialog, EditProfileSheet, modals, execution, builder |
| Reduced motion | `index.css`; Framer Motion / animation components |
| Tap targets | Button, icon buttons, form controls, execution UI |
| Modal focus | LoginDialog, EditProfileSheet, CalendarViewModal, goal modal, sheet components |
