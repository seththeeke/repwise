# Visual Consistency

## Goal

Unify spacing, typography, button styles, icons, colors, border radii, image handling, and animations so the app feels intentional rather than patchy.

**Reference:** [polishing-ideas.md](./polishing-ideas.md) — Visual Consistency section

---

## Current State

| Item | Status |
|------|--------|
| **Spacing** | Tailwind default (4px base); no documented scale; values vary (p-2, p-3, p-4, px-4, etc.) |
| **Typography** | DM Sans, DM Mono; no formal hierarchy (title/subtitle/body/label) |
| **Button styles** | Primary (purple), secondary (gray); no consistent destructive style |
| **Icons** | Lucide throughout; consistent |
| **Color tokens** | `--color-primary: #7c3aed` in index.css; Tailwind extends primary, accent; some hardcoded hex |
| **Border radii** | Mixed: rounded-lg, rounded-xl, rounded-2xl, rounded-full |
| **Images** | Profile: Avatar with fallback; no exercise images in catalog |
| **Animations** | Framer Motion for modals/toasts; no documented easing/duration |

---

## Key Decisions

- **Spacing:** Adopt 4pt or 8pt grid; document scale (e.g. 4, 8, 12, 16, 24, 32)
- **Typography:** Define levels: title (xl/2xl), subtitle (lg), body (base), label (sm)
- **Buttons:** Primary (purple), secondary (outline/gray), destructive (red) — use consistently
- **Icons:** Lucide only; no mixing
- **Colors:** Semantic tokens (--color-primary, --color-danger, --color-success) instead of raw hex
- **Border radii:** Standardize: small (8px), medium (12px), large (16px), pill (9999px)
- **Images:** Consistent aspect ratio, object-fit: cover, placeholder (blur or gray) while loading
- **Animation:** Same easing (e.g. ease-out) and duration (200–300ms) for transitions

---

## Implementation Checklist

### Spacing Scale

- [ ] Document spacing scale in Tailwind or CSS (e.g. space-1=4px, space-2=8px, ...)
- [ ] Audit components for random padding/margin (13px, 17px, etc.)
- [ ] Replace with scale values; stick to 4pt or 8pt grid

### Typography Hierarchy

- [ ] Define: `text-title` (2xl, font-bold), `text-subtitle` (lg, font-semibold), `text-body` (base), `text-label` (sm, text-gray-500)
- [ ] Apply consistently to headers, cards, forms
- [ ] Limit to 2–3 font weights across app

### Button Styles

- [ ] Primary: bg-primary, hover:bg-primary-dark (existing)
- [ ] Secondary: outline or bg-gray-100; used for cancel, back
- [ ] Destructive: red for delete, remove — define and use for "Delete account", "Remove exercise"
- [ ] Ensure all primary actions use primary button; secondary actions use secondary

### Icon Set

- [ ] Confirm Lucide only; remove any stray Material or custom PNGs
- [ ] Consistent size: w-4 h-4 for inline, w-5 h-5 for buttons, w-6 h-6 for headers

### Color System

- [ ] Extend index.css with semantic tokens: --color-danger, --color-success, --color-warning
- [ ] Replace hardcoded red/green/amber with tokens
- [ ] Use Tailwind theme.extend.colors for consistency

### Border Radii

- [ ] Define: small (rounded-lg), medium (rounded-xl), large (rounded-2xl)
- [ ] Cards: rounded-xl; buttons: rounded-xl or rounded-lg; chips: rounded-full
- [ ] Audit and align components

### Image Handling

- [ ] Profile photos: ensure aspect-ratio square, object-fit cover, placeholder (gradient or initials)
- [ ] Exercise images (if added): consistent ratio (e.g. 16:9 or 1:1), placeholder while loading
- [ ] Add loading state (skeleton or blur) for Avatar when URL is slow

### Animation Consistency

- [ ] Document: transition duration 200ms for micro, 300ms for modals; ease-out
- [ ] Apply to: modal enter/exit, toast, page transitions
- [ ] Use Framer Motion or CSS transitions consistently
- [ ] Respect prefers-reduced-motion (see accessibility spec)

---

## Files to Modify

| Area | Files |
|------|-------|
| Design tokens | `packages/web/src/index.css`, `packages/web/tailwind.config.js` |
| Components | Button, Avatar, cards, modals |
| Pages | All screens using typography, spacing, buttons |
