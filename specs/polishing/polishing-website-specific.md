# Website-Specific Polish

## Goal

Ensure the Repwise web app is responsive, discoverable, and professional: proper breakpoints, page titles and favicon, branded 404, SEO basics on landing, smooth scroll, loading state on initial load, keyboard nav, robots.txt/sitemap, HTTPS, cookie banner (when analytics added), and print stylesheet.

**Reference:** [polishing-ideas.md](./polishing-ideas.md) — Website-Specific Polish section

---

## Current State

| Item | Status |
|------|--------|
| **Responsive layout** | Tailwind; not audited at 375px, 768px, 1440px |
| **Page title** | Fixed "Repwise" in [index.html](../../packages/web/index.html) |
| **Favicon** | Set: `/favicon.png`, `/favicon.svg` |
| **404 page** | No catch-all route; CloudFront returns index.html for 404 (SPA fallback) |
| **SEO landing** | No meta description, og:image, etc. |
| **Smooth scroll** | Not explicitly set |
| **Initial load** | Possible FOUC (flash of unstyled content) before React mounts |
| **Keyboard nav** | Partial aria-labels; tab order not audited; no skip-nav |
| **robots.txt / sitemap** | Not present |
| **HTTPS** | CloudFront/CDK should enforce; verify |
| **Cookie banner** | Not implemented (no analytics yet) |
| **Print stylesheet** | Not implemented |

---

## Key Decisions

- **404:** Add `Route path="*"` in App.tsx; render branded NotFound component with nav home
- **Page titles:** `useEffect` + `document.title` per route, or react-helmet-async
- **SEO:** Add meta description, og:title, og:description, og:image to landing (index.html or helmet)
- **Cookie banner:** Defer until analytics/tracking added
- **Print:** Low effort; `@media print` for workout plans, dashboard summary

---

## Implementation Checklist

### Responsive Layout

- [ ] Audit at 375px (mobile), 768px (tablet), 1440px (desktop)
- [ ] Fix any overflow, broken grids, or tiny tap targets
- [ ] Ensure Dashboard, workout execution, profile, feed are usable at all sizes
- [ ] Document breakpoints used (Tailwind sm/md/lg/xl)

### Page Title and Favicon

- [ ] Favicon: Already set; verify in production
- [ ] Page titles per route:
  - [ ] Dashboard: "Dashboard | Repwise"
  - [ ] Workouts: "Workouts | Repwise"
  - [ ] Goals: "Goals | Repwise"
  - [ ] Profile: "{displayName} | Repwise"
  - [ ] Login/landing: "Repwise — Track your fitness"
- [ ] Use `useEffect` with `document.title` in route components, or centralize with react-helmet-async

### 404 Page

- [ ] Add `Route path="*" element={<NotFoundPage />}` in App.tsx
- [ ] NotFoundPage: branded layout, "Page not found" message, link/button to go home
- [ ] Match app styling (purple, Repwise branding)

### SEO Basics on Landing

- [ ] Add `<meta name="description" content="...">` for landing
- [ ] Add `og:title`, `og:description`, `og:image` for link sharing
- [ ] Ensure og:image is 1200x630 or similar; use app icon or custom image
- [ ] Consider separate landing route vs dashboard for public vs authenticated

### Smooth Scroll

- [ ] Add `scroll-behavior: smooth` to html or body in CSS
- [ ] Test anchor links (e.g. skip-nav, in-page links)
- [ ] Ensure no jarring jumps on navigation

### Initial Load / FOUC

- [ ] Add loading state in index.html (e.g. spinner or minimal shell) so users see something immediately
- [ ] Or: ensure critical CSS inlined so no flash of unstyled content
- [ ] Test with throttled network to see first paint

### Accessible Keyboard Navigation

- [ ] Audit tab order: ensure logical flow through main content, nav, modals
- [ ] Add skip-nav link: "Skip to main content" at top of page
- [ ] Ensure focus rings visible (Tailwind `focus:ring-2` or similar)
- [ ] Modal focus trap: see [polishing-accessibility.md](./polishing-accessibility.md)

### robots.txt and sitemap.xml

- [ ] Add `public/robots.txt`: allow crawlers; optionally disallow /dashboard if private
- [ ] Add `public/sitemap.xml` with landing page, any public routes
- [ ] Ensure CloudFront serves these from S3/website

### HTTPS

- [ ] Verify CDK/CloudFront redirects HTTP to HTTPS
- [ ] Check "Not Secure" never appears in production

### Cookie Banner (Deferred)

- [ ] When analytics/tracking added: implement cookie consent banner
- [ ] Required in many jurisdictions (GDPR, etc.)

### Print Stylesheet

- [ ] Add `@media print` rules
- [ ] Hide nav, FAB, non-essential UI when printing
- [ ] Ensure workout plans, workout history print cleanly
- [ ] Consider `window.print()` for "Print workout" action

---

## Files to Modify

| Area | Files |
|------|-------|
| Routes | `packages/web/src/App.tsx` |
| 404 | New `packages/web/src/pages/NotFoundPage.tsx` (or similar) |
| Head / SEO | `packages/web/index.html` or react-helmet; landing component |
| CSS | `packages/web/src/index.css` (smooth scroll, print) |
| Static assets | `packages/web/public/robots.txt`, `packages/web/public/sitemap.xml` |
| CDK | `packages/cdk/lib/website.ts` — verify HTTPS redirect |
