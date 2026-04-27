# Story 1.2: Design Tokens, Theme Bootstrap & Typography

Status: ready-for-dev

## Story

As Sam,
I want the application to load with the correct visual theme and typography without any flash of wrong appearance,
So that first impressions of the app are calm and consistent regardless of my OS preference.

## Acceptance Criteria

1. **Given** the user has no stored theme preference and OS prefers dark mode, **When** the app loads, **Then** `data-theme="dark"` is set on `<html>` synchronously before first paint with no flash of unstyled content (FOUC).

2. **Given** the user has `localStorage.theme = "light"` in a dark-preference OS, **When** the app loads, **Then** `data-theme="light"` is applied (user override wins over OS preference).

3. **Given** both themes are defined, **When** the light theme is active, **Then** `--color-paper: #F4EFE6`, `--color-ink: #1F1A14`, `--color-ink-muted: rgba(31,26,20,.6)`, `--color-rule: rgba(31,26,20,.133)`, `--color-accent: #9C3B1B` are applied.

4. **Given** both themes are defined, **When** the dark theme is active, **Then** `--color-paper: #1A1612`, `--color-ink: #E8DFCE`, `--color-ink-muted: rgba(232,223,206,.6)`, `--color-rule: rgba(232,223,206,.133)`, `--color-accent: #6B8E7F` are applied.

5. **Given** the app is rendered, **When** any text element is inspected, **Then** body font is Fraunces Variable (self-hosted at `apps/web/public/fonts/Fraunces-VF.woff2`, subset Latin+Latin-Ext, `font-display: block`), 18px, weight 400, line-height 1.55, letter-spacing 0; no other font families are used in component code.

6. **And** spacing scale tokens are defined (4/8/12/16/24/32/48/64/96px); Tailwind's default spacing scale is disabled.

7. **And** `--motion-instant: 0ms` token is defined and applied on the `prefers-reduced-motion: reduce` path; no other animation runs under that preference.

8. **And** a visual-regression snapshot of the blank screen passes for both light and dark themes.

## Tasks / Subtasks

- [ ] Task 1: Download and configure Fraunces Variable font (AC: #5)
  - [ ] 1.1 Download Fraunces Variable woff2 (Latin + Latin-Ext subset, `opsz: 14` optical variant) to `apps/web/public/fonts/Fraunces-VF.woff2`
  - [ ] 1.2 Add `@font-face` declaration in `globals.css` with `font-display: block`, `font-variation-settings: 'opsz' 14`
  - [ ] 1.3 Add `<link rel="preload">` for the font in `index.html`
- [ ] Task 2: Implement complete `@theme` token blocks (AC: #3, #4, #6, #7)
  - [ ] 2.1 Replace placeholder `@theme` in `globals.css` with light theme tokens scoped to `[data-theme="light"]`: `--color-paper: #F4EFE6`, `--color-ink: #1F1A14`, `--color-ink-muted: rgba(31,26,20,.6)`, `--color-rule: rgba(31,26,20,.133)`, `--color-accent: #9C3B1B`
  - [ ] 2.2 Add dark theme tokens scoped to `[data-theme="dark"]`: `--color-paper: #1A1612`, `--color-ink: #E8DFCE`, `--color-ink-muted: rgba(232,223,206,.6)`, `--color-rule: rgba(232,223,206,.133)`, `--color-accent: #6B8E7F`
  - [ ] 2.3 Define spacing scale tokens (4/8/12/16/24/32/48/64/96px) and disable Tailwind's default spacing scale
  - [ ] 2.4 Define typography tokens: `--font-body: 'Fraunces', serif`, `--font-size-body: 18px`, `--line-height-body: 1.55`, `--letter-spacing-body: 0`
  - [ ] 2.5 Define motion tokens: `--motion-default: 150ms`, `--motion-instant: 0ms`; apply `--motion-instant` under `prefers-reduced-motion: reduce`
  - [ ] 2.6 Add base styles: `html { background: var(--color-paper); color: var(--color-ink); font-family: var(--font-body); font-size: var(--font-size-body); line-height: var(--line-height-body); }`
  - [ ] 2.7 Verify WCAG AA contrast ratios: ink-on-paper >= 4.5:1, muted-on-paper >= 4.5:1, accent-on-paper >= 3:1 for both themes
- [ ] Task 3: Create theme bootstrap script (AC: #1, #2)
  - [ ] 3.1 Create `apps/web/src/theme-bootstrap.ts` — reads `localStorage.theme`, falls back to `prefers-color-scheme`, sets `data-theme` attribute on `<html>`
  - [ ] 3.2 Inline the compiled bootstrap script in `index.html` `<head>` (before any other scripts) to prevent FOUC — use Vite's `transformIndexHtml` hook or a raw inline `<script>`
  - [ ] 3.3 Verify no FOUC: app must not flash wrong theme on any load path (no preference stored, preference stored, OS change)
- [ ] Task 4: Update App component for theme support (AC: #1, #2)
  - [ ] 4.1 Ensure `<html>` element has `data-theme` attribute set by bootstrap script (no SolidJS ownership of this attribute — it's set before framework mounts)
  - [ ] 4.2 Apply `bg-paper text-ink` (or equivalent token-based utility classes) to root layout
- [ ] Task 5: Write tests for theme system (AC: #1, #2, #3, #4, #5, #7)
  - [ ] 5.1 Unit test: theme-bootstrap logic — defaults to OS preference, localStorage override wins, sets correct attribute
  - [ ] 5.2 Unit test: contrast ratio assertions for both themes (ink-on-paper, muted-on-paper, accent-on-paper) — parse token hex values and compute ratios
  - [ ] 5.3 Unit test: Fraunces font-face is declared and loads (verify computed style on text element)
  - [ ] 5.4 Unit test: spacing scale tokens match spec (4/8/12/16/24/32/48/64/96)
  - [ ] 5.5 Unit test: motion token resolves to 0ms under `prefers-reduced-motion: reduce`
- [ ] Task 6: Visual regression snapshots (AC: #8)
  - [ ] 6.1 Create Playwright visual-regression test at `tests/e2e/visual-regression.spec.ts`
  - [ ] 6.2 Capture blank-screen snapshot for light theme (desktop viewport)
  - [ ] 6.3 Capture blank-screen snapshot for dark theme (desktop viewport)
  - [ ] 6.4 Verify empty state contains only the page background and minimal content — no chrome, no illustration

## Dev Notes

### CRITICAL: Architecture vs Epics Discrepancies (Inherited from 1.1)

**The architecture document is the source of truth.** Key corrections:
1. **Framework**: SolidJS, NOT React. All component code uses Solid's JSX.
2. **Directory**: `apps/api`, NOT `apps/server`.
3. **Database**: SQLite, NOT PostgreSQL (relevant for later stories).

### Architecture Compliance

**Tailwind v4 strict-token mode** (AR3, UX spec):
- ALL colors, spacing, type sizes, radii, motion durations defined in per-theme `@theme` blocks
- Default Tailwind palette and scales MUST be disabled
- A lint rule prohibits unprefixed default-palette utilities (`bg-blue-500`, `text-gray-700`, `font-sans`)
- Every utility must resolve to a project token (`bg-ink`, `text-paper`, `border-rule`, `font-default`)

**Theming implementation** (AR9, UX-DR1, UX-DR4):
- Two complete `@theme` blocks — `light` and `dark`
- Theme switch via `[data-theme="light"|"dark"]` attribute on `<html>`
- Theme attribute set by inline `<head>` script BEFORE first paint (prevents FOUC)
- User override persists to `localStorage`
- Default driven by `prefers-color-scheme` media query

**Color identity** (UX spec):
- Light: "Field Notes paper" — warm off-white + rust accent
- Dark: "Reading-lamp coffee" — warm dark brown-black + verdigris accent
- Each theme is a deliberate composition, NOT an auto-inversion
- NO additional colors: no success-green, error-red, warning-yellow
- 5 tokens per theme is the ENTIRE color system

**Typography** (UX-DR5, UX-DR6):
- **Fraunces Variable** — free variable serif with personality at body sizes
- Self-hosted at `apps/web/public/fonts/Fraunces-VF.woff2`
- Subsetted to Latin + Latin-Ext (~100KB estimated)
- `font-display: block` (prevents flash-of-unstyled-text for first ~200ms, then swaps)
- Only ship `opsz: 14` optical variant
- Single type level: 18px body, weight 400, line-height 1.55, letter-spacing 0
- NO `font-sans`/`font-serif`/`font-mono` fallback families exposed in component code
- State expression (completed tasks) uses opacity + strike-through, NOT a second weight

**Spacing scale** (UX-DR2): 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 px — replaces Tailwind's default

**Motion tokens** (UX-DR3): explicit `--motion-instant: 0ms` applied under `prefers-reduced-motion: reduce`. Reduced-motion must NOT slow perceived response (NFR-Perf-9).

### Technical Implementation Details

**Theme bootstrap script (`theme-bootstrap.ts`):**
```typescript
// This script runs inline in <head> BEFORE any other JS
// It must be synchronous and tiny — no imports, no framework code
(function() {
  const stored = localStorage.getItem('theme');
  const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', stored || preferred);
})();
```

**Tailwind v4 @theme structure in `globals.css`:**
- Use `@theme` blocks to define CSS custom properties as Tailwind tokens
- Scope theme-specific values to `[data-theme="light"]` and `[data-theme="dark"]` selectors
- Define shared structural tokens (spacing, typography) in an unscoped `@theme` block
- The token names must be semantic: `--color-ink`, `--color-paper`, NOT `--color-dark-brown`

**Font acquisition:**
- Download from Google Fonts API or fontsource: `Fraunces[opsz,wght].woff2`
- Subset using `pyftsubset` or `glyphhanger` to Latin + Latin-Ext
- Target file size: ~100KB (well within total 150KB budget — current JS is only 2.8KB gzipped)

**Contrast ratio validation:**
- Light: ink (#1F1A14) on paper (#F4EFE6) — compute relative luminance, verify >= 4.5:1
- Light: muted (rgba(31,26,20,.6) composited on #F4EFE6) on paper — verify >= 4.5:1
- Light: accent (#9C3B1B) on paper — verify >= 3:1
- Dark: ink (#E8DFCE) on paper (#1A1612) — verify >= 4.5:1
- Dark: muted (rgba(232,223,206,.6) composited on #1A1612) on paper — verify >= 4.5:1
- Dark: accent (#6B8E7F) on paper — verify >= 3:1

### Existing Files Being Modified

**`apps/web/src/styles/globals.css`** — Currently has placeholder @theme with `--color-primary`, `--color-background`, `--color-foreground`. Replace entirely with the real token system.

**`apps/web/src/styles/tailwind.css`** — Currently `@import "tailwindcss"; @import "./globals.css";`. May need adjustments for Tailwind v4 theme configuration.

**`apps/web/index.html`** — Currently has basic HTML with `<div id="root">`. Needs: inline theme bootstrap script in `<head>`, font preload link.

**`apps/web/src/App.tsx`** — Currently a minimal placeholder. Needs token-based styling applied.

**`apps/web/src/index.tsx`** — Entry point, currently imports tailwind.css. No changes expected.

### File Naming Conventions

- Components: `PascalCase.tsx`
- Non-component modules: `kebab-case.ts`
- Test files: co-located, same name + `.test.ts(x)`
- Styles: `kebab-case.css`

### Previous Story Intelligence (1.1)

- Monorepo scaffold is complete with pnpm workspaces
- Tailwind v4 + `@tailwindcss/vite` is already installed and configured
- `vite-plugin-solid` is configured
- ESLint flat config with `no-console`, per-workspace globals works
- Vitest and Playwright are installed at root
- Bundle is currently 2.8KB gzipped JS — massive headroom for Fraunces font (~100KB) and token CSS
- Sandbox environment requires `COREPACK_HOME=.corepack` prefix for pnpm commands
- tsx has pipe issues in sandbox — use `node --experimental-strip-types` for scripts

### Project Structure Notes

Files created/modified by this story:
```
apps/web/
├── public/
│   └── fonts/
│       └── Fraunces-VF.woff2         # NEW: self-hosted variable font
├── src/
│   ├── styles/
│   │   ├── globals.css               # UPDATE: full @theme blocks + tokens
│   │   └── tailwind.css              # UPDATE: if needed for theme config
│   ├── theme-bootstrap.ts            # NEW: inline head script
│   ├── App.tsx                       # UPDATE: token-based styling
│   └── index.tsx                     # NO CHANGE expected
├── index.html                        # UPDATE: bootstrap script + font preload
tests/
└── e2e/
    └── visual-regression.spec.ts     # NEW: blank-screen snapshots
```

### References

- [Source: architecture.md#Styling Solution] — Tailwind v4 strict-token mode, @theme blocks
- [Source: architecture.md#Decision Impact Analysis] — tokens + theme is Phase 2 of implementation
- [Source: architecture.md#Complete Project Directory Structure] — theme-bootstrap.ts, globals.css, fonts/
- [Source: architecture.md#Frontend Application Architecture] — Fraunces font-display strategy
- [Source: ux-design-specification.md#Color System] — full token hex values, theme names
- [Source: ux-design-specification.md#Typography System] — Fraunces selection, type scale, font loading
- [Source: ux-design-specification.md#Spacing & Layout Foundation] — spacing scale values
- [Source: ux-design-specification.md#Design System Foundation] — strict token mode rationale
- [Source: ux-design-specification.md#Accessibility Considerations] — contrast ratios, reduced motion
- [Source: epics.md#Story 1.2] — acceptance criteria
- [Source: epics.md#UX-DR1 through UX-DR6] — design requirements
- [Source: epics.md#AR3, AR9] — Tailwind v4 and theme bootstrap requirements

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
