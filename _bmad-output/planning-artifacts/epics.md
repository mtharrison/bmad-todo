---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics']
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
releaseMode: 'mvp-plus-post-mvp'
project_name: 'bmad-todo'
user_name: 'Matt'
date: '2026-04-27'
workflowType: 'create-epics-and-stories'
workflowComplete: false
---

# bmad-todo - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for **bmad-todo**, decomposing the requirements from the PRD, UX Design Specification, and Architecture Decision Document into implementable stories.

The product is a single-user personal todo web application whose differentiator is **dignified absence**: calm, silent, instant, honest. Distinctiveness lives in what the product *refuses to do* (anti-feature contract, FR46–54), in CI-enforced latency budgets (NFR-Perf-1/2/3), and in test-first rigor on every destructive operation (NFR-Maint-1, NFR-Rel-2/3).

**Release shape:** Single MVP epic delivers character-complete v1; post-MVP epics queue Growth (multi-device sync, search, snooze, etc.) and Vision scope.

## Requirements Inventory

### Functional Requirements

**Task Capture**
- **FR1:** User can add a new task by typing text and pressing a single confirmation key.
- **FR2:** User can begin typing a new task on app open without first focusing or selecting any UI element.
- **FR3:** User can add a new task from anywhere via a global capture shortcut, without first navigating to the application. *(Architecture amendment: cross-tab `cmd+enter` is PWA-window-scoped in v1; cross-tab native capture is Growth scope.)*
- **FR4:** System captures task text exactly as typed; no auto-correction, auto-formatting, or text rewriting is applied.
- **FR5:** System never requires additional metadata (priority, due date, project, tags) at capture time.

**Task Lifecycle**
- **FR6:** User can mark an active task as complete via a single keystroke when it has focus, or via a single pointer/touch interaction on its row.
- **FR7:** User can mark a completed task as incomplete via the same gesture.
- **FR8:** User can edit the text of an existing task in-place, without leaving the list view or entering a separate edit mode.
- **FR9:** User can delete a task via a single keystroke or gesture.
- **FR10:** System retains completed tasks in the visible list for the duration of the session; completed tasks are not hidden, archived, or auto-removed.
- **FR11:** System orders tasks newest-first; the most recently added task is at the top.
- **FR12:** User can undo any destructive or state-changing action — completion, completion-reversal, edit, deletion — for the duration of the session.
- **FR13:** System restores undone tasks to their exact prior state, including text, position, and completion status.

**Task Display & Composition**
- **FR14:** System presents tasks in a single asymmetric column without section headers, grouping, or filter chrome.
- **FR15:** System displays no checkbox or completion-state UI element on a task row at rest; affordances appear only on focus or hover.
- **FR16:** System distinguishes completed tasks from active tasks via both a visible mark (strike-through and reduced opacity) and a programmatic state attribute consumable by assistive technology.
- **FR17:** System renders the empty state as a single capture line on a generous canvas, without illustration, motivational text, or onboarding content.
- **FR18:** System uses a single typeface and a single type scale across the entire application.
- **FR19:** System uses a generous body-text size (≥16px equivalent).
- **FR20:** System merges the task-capture input into the top of the list, with no separate "add" button or visually distinct input region.

**Persistence & Sync**
- **FR21:** System persists tasks across page refresh, browser close-and-reopen, and device restart.
- **FR22:** System renders the user's existing tasks from local cache on every visit after the first, before any network response is required.
- **FR23:** System reconciles local cache with server-authoritative state in the background, after initial paint.
- **FR24:** System applies all user mutations to local state and the visible UI synchronously, without waiting for a network response.
- **FR25:** System queues mutations issued while offline and replays them in order upon reconnection.
- **FR26:** System ensures replayed mutations are idempotent — a duplicate mutation does not produce duplicate state.
- **FR27:** System remains fully operative (read and write) while offline, deferring server reconciliation until reconnection.
- **FR28:** System never displays a skeleton, spinner, or "saving…" indicator for any user-initiated action.

**Reliability Surfaces**
- **FR29:** System displays a single fixed-position indicator only when an abnormal state exists (offline, sync conflict, persistence failure).
- **FR30:** System never displays a success indicator (toast, modal, banner) for routine user actions.
- **FR31:** System never blocks the user from issuing the next action while feedback for a prior action is rendering or animating.

**Input & Navigation**
- **FR32:** User can navigate between tasks using the keyboard.
- **FR33:** User can perform every MVP operation (add, complete, uncomplete, edit, delete, undo) using the keyboard alone.
- **FR34:** User can perform the same operations via pointer or touch alternatives.
- **FR35:** System never requires modal dialogs for primary task operations; edits and confirmations happen in-place.

**Theming & Accessibility**
- **FR36:** System provides both a light theme and a dark theme, each fully designed to the same standard.
- **FR37:** System defaults the active theme to the user's operating-system preference.
- **FR38:** User can override the system theme preference.
- **FR39:** System persists the user's theme override across sessions.
- **FR40:** System satisfies WCAG 2.1 AA color-contrast requirements in both themes.
- **FR41:** System honors the user's reduced-motion preference and removes decorative motion when set.
- **FR42:** System exposes the task list, individual task state, and the capture line to assistive technology with correct semantic roles.
- **FR43:** System surfaces the abnormal-state indicator to assistive technology via a polite live region.

**Quality Self-Honesty**
- **FR44:** System provides a hidden developer mode, reachable via a keyboard combination (`cmd+shift+L`), that displays live keystroke-to-render latency.
- **FR45:** Project repository contains a publicly accessible anti-feature contract document enumerating the behaviors the product refuses to implement.

**Anti-Feature Contract (commitments to observable absence)**
- **FR46:** System provides no onboarding tour, tooltip walkthrough, or first-time-user instructional modal.
- **FR47:** System provides no usage statistics, time-tracking metrics, or activity reporting against the user.
- **FR48:** System provides no streak count, achievement points, level progression, or other gamification surface.
- **FR49:** System provides no leaderboard, social sharing, or peer-comparison surface.
- **FR50:** System provides no re-engagement notification, email digest, or absence-based prompt.
- **FR51:** System provides no autocomplete that flickers, rewrites text mid-keystroke, or modifies typed text without explicit user confirmation.
- **FR52:** System produces no audible notification by default.
- **FR53:** All motion in the application communicates state change. The system contains no decorative, ambient, or loading-flourish motion.
- **FR54:** System never reorders or repositions tasks, controls, or affordances based on inferred user behavior, AI ranking, or contextual scoring. Position is determined by deterministic rules (creation order, newest-first).

### NonFunctional Requirements

**Performance**
- **NFR1 (Perf-1):** p95 latency from keystroke to rendered character in the capture line: **<16ms**. CI-enforced.
- **NFR2 (Perf-2):** p95 latency from completion gesture to visible strike-through: **<50ms**. CI-enforced.
- **NFR3 (Perf-3):** p95 latency from `enter` to task-appears-in-list (warm session, cached): **<100ms**. CI-enforced.
- **NFR4 (Perf-4):** Cached cold load — first paint with N=100 tasks visible: **<100ms after JS evaluation completes**.
- **NFR5 (Perf-5):** First-ever load (empty cache) to interactive on Fast 3G simulated network: **<2s**.
- **NFR6 (Perf-6):** Initial JS bundle **≤50KB gzipped**; total bundle (all chunks) **≤150KB gzipped**. CI-enforced.
- **NFR7 (Perf-7):** Memory footprint under a sustained 1000-task workload: **<50MB**.
- **NFR8 (Perf-8):** All performance budgets above are enforced in CI; regression on any budget fails the build.
- **NFR9 (Perf-9):** Latency budgets remain honored under `prefers-reduced-motion`; reduced-motion must not slow perceived response.

**Reliability & Data Integrity**
- **NFR10 (Rel-1):** No task data loss across page refresh, browser close, or device restart, other than tasks the user has explicitly deleted and not undone within the session.
- **NFR11 (Rel-2):** Sync invariants — *never duplicate, never lose* — hold under a 1000-operation randomized workload including simulated offline/online/conflict transitions. Verified by property-based tests in CI.
- **NFR12 (Rel-3):** Every destructive operation has a reversibility test that verifies exact-state restoration (text, position, completion status). Coverage of destructive operations by reversibility tests: **100%**.
- **NFR13 (Rel-4):** Server retains soft-deleted tasks for **≥30 days** to support cross-session recovery edge cases and future undo-beyond-session functionality.
- **NFR14 (Rel-5):** Idempotency keys on all mutations; server tolerates **≥10 retries** of the same operation without producing duplicate state. *Architecture amendment: idempotency-key TTL extended from 24h to 14 days.*
- **NFR15 (Rel-6):** Outbox replay order is preserved across reconnect; partial-replay failures do not corrupt the queue.

**Accessibility**
- **NFR16 (A11y-1):** WCAG 2.1 Level AA compliance, verified by automated audit (axe-core or equivalent) running in CI on every PR.
- **NFR17 (A11y-2):** Color contrast: **≥4.5:1** for body text; **≥3:1** for UI components and meaningful graphical objects, in both light and dark themes.
- **NFR18 (A11y-3):** **100%** of MVP user-facing functionality reachable via keyboard alone; verified by automated keyboard-only end-to-end test.
- **NFR19 (A11y-4):** Manual screen-reader verification before v1 ship against **VoiceOver (macOS and iOS)** and **NVDA (Windows)**.
- **NFR20 (A11y-5):** All interactive controls expose accessible names via the accessibility tree.
- **NFR21 (A11y-6):** Decorative motion respects `prefers-reduced-motion: reduce`; non-decorative state transitions degrade to instant when the preference is set.
- **NFR22 (A11y-7):** Touch targets meet **≥44×44px** minimum on mobile viewports.
- **NFR23 (A11y-8):** Content remains usable up to **200% zoom** without horizontal scroll.

**Privacy**
- **NFR24 (Priv-1):** Task text is user-private data; never logged in plaintext server-side beyond what is required for storage.
- **NFR25 (Priv-2):** No third-party analytics, tracking pixels, advertising SDKs, or session-replay tooling in v1.
- **NFR26 (Priv-3):** Application root serves `noindex, nofollow`; task content is never indexable by search engines.
- **NFR27 (Priv-4):** Server-side data partitioning by per-user namespace from day one, even though only one user exists in v1; cross-user data leakage is prevented by design.
- **NFR28 (Priv-5):** All transport over HTTPS; HTTP requests redirected; HSTS header present.

**Security**
- **NFR29 (Sec-1):** All user-supplied text rendered as plain text only; no HTML, script, or markdown is evaluated in v1.
- **NFR30 (Sec-2):** Backend enforces a maximum task-text length (≤10,000 characters) to prevent abuse — both Zod schema and SQL CHECK constraint.
- **NFR31 (Sec-3):** Backend applies basic rate limiting per user namespace (100 req/min via `@fastify/rate-limit`).
- **NFR32 (Sec-4):** Dependency vulnerability audit (`pnpm audit --audit-level=high`) runs in CI; high-severity advisories fail the build.
- **NFR33 (Sec-5):** No credentials, API keys, or secrets in the client bundle. All server secrets injected at deploy time only (Fly secrets).
- **NFR34 (Sec-6):** v1 deploys without authentication; access-restricted at the network/transport layer (Cloudflare Access).
- **NFR35 (Sec-7):** Future auth (Growth) must use industry-standard mechanisms (OAuth/OIDC). Architecture leaves a clean seam (`user_namespace` populated from JWT `sub` claim).

**Maintainability**
- **NFR36 (Maint-1):** Property-based tests cover **100%** of destructive operations (add, complete, uncomplete, edit, delete, undo).
- **NFR37 (Maint-2):** Sync layer covered by a stress-test suite simulating offline/online/conflict transitions; runs in CI.
- **NFR38 (Maint-3):** Anti-feature regressions detected in CI via: visual-regression test on the empty/at-rest state; codebase lint/grep that fails on forbidden patterns (analytics SDK names, gamification keywords, blocking-animation patterns).
- **NFR39 (Maint-4):** Anti-feature contract document (FR45) referenced from `CONTRIBUTING.md` so contributors encounter it before proposing features.
- **NFR40 (Maint-5):** Test suite (unit + property + perf + a11y) completes in **<5 minutes** on CI to keep the discipline cheap.

**Scalability**
- **NFR41 (Scale-1):** Not a v1 concern. v1 is a single-user personal deploy. Stateless backend + namespaced data model make horizontal scaling additive in Growth.

**Observability**
- **NFR42 (Obs-1):** Latency budgets produce automated pass/fail signal on every PR.
- **NFR43 (Obs-2):** Live keystroke-to-render latency observable in dev mode (per FR44) for runtime self-honesty validation.
- **NFR44 (Obs-3):** No production telemetry on user behavior in v1, consistent with privacy and anti-feature posture.

### Additional Requirements

*Technical requirements derived from the Architecture Decision Document that affect implementation order and structure.*

**Repository & toolchain (Phase 1 / Foundation prerequisites — these block all other stories):**
- **AR1 (Starter Template):** Project initialized with **`create-solid` "ts" template** (plain SolidJS + Vite + TypeScript; *not* SolidStart). Initialization is the first implementation story.
- **AR2:** **pnpm workspace monorepo** layout: `apps/web/` (SPA), `apps/api/` (Fastify), `packages/shared/` (Zod schemas + SW message types). Root `pnpm-workspace.yaml`, `tsconfig.base.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- **AR3:** **Tailwind v4** added immediately after scaffold (`@tailwindcss/vite`). Strict-token mode enforced via custom `@theme` blocks; lint rule blocks unprefixed default-palette utilities (e.g., `bg-blue-500`).
- **AR4:** **Node ≥20 LTS** (committed via `.nvmrc`); pnpm config in `.npmrc`.

**Frontend infrastructure:**
- **AR5:** **`vite-plugin-pwa`** with `injectManifest` strategy backs the service worker. Workbox modules used selectively (`precaching`, `routing`, `strategies`, `background-sync`).
- **AR6:** **`idb`** wrapper for IndexedDB; two object stores: `tasks` (cached server state + pending mutations applied) and `outbox` (FIFO mutation queue).
- **AR7:** **`uuidv7`** for all client-generated IDs (lexicographically time-ordered; `ORDER BY id DESC` ≡ `ORDER BY created_at DESC`).
- **AR8:** Service worker **must explicitly exclude `/cdn-cgi/access/*` paths** from caching (Cloudflare Access compatibility); test verifies SW does not return stale 200 on JWT expiry.
- **AR9:** Inline `<head>` theme bootstrap script reads `localStorage.theme` || `prefers-color-scheme` and sets `data-theme` attribute *before first paint* (no flash-of-wrong-theme).

**Backend infrastructure:**
- **AR10:** **Fastify** + **Kysely** (typed SQL builder) + **better-sqlite3** + **Zod** (`fastify-type-provider-zod` for typed routes). Hand-scaffolded; no backend starter.
- **AR11:** SQLite schema via plain `.sql` migrations in `apps/api/migrations/NNNN_description.sql`, applied lexicographically at boot via custom `migrate.ts`. Tables: `tasks` (with `user_namespace`, `deleted_at` soft-delete), `idempotency_keys`, `migrations`. WAL mode enabled.
- **AR12:** **REST endpoints** (the entire API surface): `GET /tasks`, `POST /tasks`, `PATCH /tasks/:id`, `DELETE /tasks/:id`, `GET /health`. Naked-resource success responses; uniform `{ error: { code, message } }` envelope on error. Status codes: 200/201/204/400/404/409/429/5xx.
- **AR13:** **Idempotency-Key middleware** (Fastify hook): every mutating request requires `Idempotency-Key` header (UUIDv7). Server stores `(key, request_hash, response)` for **14 days** *(amendment from default 24h)*. Replay with same key returns stored response; replay with different body but same key → 409.
- **AR14:** **`@fastify/rate-limit`** at 100 req/min per `user_namespace`; 429 surfaces to client with `Retry-After`.
- **AR15:** **`pino`** for structured JSON logging; redaction rule blocks any log payload containing a `text` field (NFR-Priv-1 enforcement). `event` field is the canonical name (`<resource>.<verb>`). ESLint rule `no-restricted-syntax` blocks `log.*({ ..., text })`.
- **AR16:** **Zod schemas in `packages/shared/`** define `Task`, `CreateTaskInput`, `UpdateTaskInput`, `Mutation`, `ErrorEnvelope`, `ErrorCode`, and the `SwMessage` discriminated union (Page↔SW). `z.infer<>` on the client gives end-to-end types.

**CI/CD gates (every PR must pass; deploy blocked on failure):**
- **AR17:** GitHub Actions jobs: `lint` (ESLint + anti-feature codebase grep), `typecheck` (`tsc --noEmit`), `unit-and-property` (Vitest + fast-check), `e2e-and-a11y` (Playwright + axe-core + visual regression), `latency-budget` (synthetic perf tests for NFR1/2/3), `bundle-budget` (assert ≤50KB initial / ≤150KB total gzipped), `audit` (`pnpm audit --audit-level=high`), `stress-sync` (nightly + on-tag: 1000-op outbox replay).
- **AR18:** **`scripts/check-anti-features.sh`** codebase grep job blocks: `toast(`, `Snackbar`, `Toaster`, `Skeleton`, `Spinner`, `confirm(`, `alert(`, `<Modal`, `<Dialog`, `🎉`, `✨`, `🏆`, `Streak`, `Achievement`, `XP`, `Karma`. Forbidden ESLint primitive: Solid's `<ErrorBoundary>` (errors must route to annunciator).
- **AR19:** **`scripts/check-bundle-size.ts`** parses `apps/web/dist/` and asserts initial-JS ≤50KB gzipped, total ≤150KB gzipped.
- **AR20:** ESLint config: `import/no-restricted-paths` enforces module-boundary rules (components → store → sync, no reverse imports), `no-default-export`, `no-console` (whitelist Vite dev bootstrap only).

**Deployment & operations:**
- **AR21:** **Fly.io** single-region deploy (`shared-cpu-1x`, 256MB RAM); persistent volume mounted at `/data` for SQLite; nightly volume snapshot retained 14 days.
- **AR22:** **Cloudflare Access** in front of Fly app — `Cf-Access-Jwt-Assertion` header verified against Cloudflare team JWKS at server boot. Cloudflare Access bypassed in dev (`auth-jwt` middleware checks `NODE_ENV === 'production'`). `user_namespace` populated from JWT `sub` claim.
- **AR23:** **Cloudflare R2** daily SQLite backup via `scripts/backup-db.sh` (Fly cron); retained 30 days. RTO: <1h; RPO: 24h.
- **AR24:** **Single Docker image** (`infra/Dockerfile`, multi-stage). Fastify process serves both API routes and the built SPA static assets from `apps/web/dist/` mounted at `/` (same origin → no CORS).
- **AR25:** **`infra/fly.toml`**: app config, single region, internal port 3000, persistent volume mount, `[checks]` against `/health`. Migrations run at boot before `app.listen`.

**Documentation & contributor experience:**
- **AR26:** **`docs/ANTI-FEATURES.md`** enumerates the FR46–54 anti-feature contract. **`docs/CONTRIBUTING.md`** references it. **`docs/adr/`** folder holds architecture decision records (deltas to architecture.md). **`README.md`** states the three latency budgets and points to ANTI-FEATURES.md.
- **AR27:** **`<meta name="robots" content="noindex, nofollow">`** in `apps/web/index.html` (NFR-Priv-3).

### UX Design Requirements

*Actionable design work items extracted from the UX Design Specification. Each is specific enough to generate a story with testable acceptance criteria.*

**Design tokens & theming**
- **UX-DR1:** Implement **two complete `@theme` blocks** in `apps/web/src/styles/globals.css` — *light theme "Field Notes paper"* (`--color-paper #F4EFE6`, `--color-ink #1F1A14`, `--color-ink-muted #1F1A1499`, `--color-rule #1F1A1422`, `--color-accent #9C3B1B` rust) and *dark theme "Reading-lamp coffee"* (`--color-paper #1A1612`, `--color-ink #E8DFCE`, `--color-ink-muted #E8DFCE99`, `--color-rule #E8DFCE22`, `--color-accent #6B8E7F` verdigris). No additional colors (no success-green, error-red, warning-yellow). Hex values illustrative; finalize against measured contrast in implementation.
- **UX-DR2:** Implement **restrained spacing scale tokens**: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 px. Disable Tailwind's full default scale.
- **UX-DR3:** Implement **motion tokens** including an explicit `--motion-instant` token used wherever `prefers-reduced-motion: reduce` applies. Reduced-motion path must not slow perceived response (NFR9).
- **UX-DR4:** Implement **inline `<head>` theme bootstrap script** (`theme-bootstrap.ts`) that reads `localStorage.theme` || `prefers-color-scheme` and sets `data-theme` attribute *synchronously, before first paint*. No FOUC.

**Typography**
- **UX-DR5:** Self-host **Fraunces Variable** subsetted to Latin + Latin-Ext as `apps/web/public/fonts/Fraunces-VF.woff2` (~100KB). `font-display: block` for ≤200ms then `swap`. Ship only `opsz: 14` optical variant.
- **UX-DR6:** Lock **single type level** — 18px body, single weight 400, line-height 1.55, letter-spacing 0. No `font-sans`/`font-serif`/`font-mono` fallback families exposed in component code. State expression uses opacity + strike-through, not a second weight.

**Layout**
- **UX-DR7:** Implement **asymmetric column** anchored at left+96px on desktop (≥1024px), ≤640px max-width, generous right margin. Tablet (640–1024px): 64px left / 32px right margin. Mobile (<640px): full-width minus 24px each side, top margin 48px. Inter-row spacing 16px; per-row internal padding 8px top/bottom, 0 left/right.
- **UX-DR8:** Implement layout via **container queries** (`@container` on `<main>`), not viewport media queries — layout adapts to its container. Mobile-first authoring.

**Components (7-component inventory — hand-rolled, no design system library)**
- **UX-DR9:** Implement **`<App>`** — root component, owns theme attribute, focus root, global keyboard handler (`n`, `j`/`k`, `x`, `u`, `e`, `cmd+enter`, `cmd+shift+L`). Single `<main>` landmark; no `<header>`/`<nav>`/`<aside>`. `<title>` is project name only (no task counts — FR47).
- **UX-DR10:** Implement **`<TaskList>`** — semantic `<ul role="list">`, owns roving-tabindex keyboard navigation cursor. Empty state: zero children, no placeholder text. Arrow keys alias `j`/`k` for non-vim users.
- **UX-DR11:** Implement **`<TaskRow>`** with three primary states (at-rest, focused, edit) plus completed sub-state. `<input type="checkbox">` *always programmatically present*; visually suppressed at rest via `clip-path: inset(50%)` (never `display: none`). `aria-checked` reflects completion. `contenteditable="plaintext-only"` in edit mode. No truncation; long text wraps.
- **UX-DR12:** Implement **`<CaptureLine>`** — uncontrolled `<input type="text">` (DOM owns typed text; no per-keystroke framework re-render). `aria-label="Add a task"`, `autocomplete="off"`, `spellcheck="true"`, `enterkeyhint="done"`. Auto-focused on desktop mount; *not* auto-focused on mobile (avoid summoning keyboard unbidden). Capture-line focus stickiness: `x`/`u`/`j`/`k`/theme-toggle do not steal focus.
- **UX-DR13:** Implement **`<Annunciator>`** — fixed-position bottom-right (24px from each edge), 12px circular dot in `--color-accent`. `role="status"` + `aria-live="polite"`. States: silent (default, `display: none`) / offline / sync conflict / storage error. Surfaces only after >2s transient threshold (avoid flicker on momentary network blips). Label revealed on hover/focus. Click triggers contextual recovery action. Never red-flashes; never animates.
- **UX-DR14:** Implement **`<Tick>`** — 14×14 inline SVG with single `<path>`. **Per-instance Bezier control-point variance**: jitter the two control points within ±0.4px of canonical positions, seeded by task id (stable across re-completions). Stroke `--color-accent`, 2.2px, round line-cap and line-join. `aria-hidden="true"`. Property test: two consecutive ticks are not pixel-identical.
- **UX-DR15:** Implement **`<FocusRing>`** as CSS-only pseudo-component on `:focus-visible`: 2px solid `--color-accent` outline, 4px offset, border-radius 2px. Never on `:focus` alone (mouse clicks should not show ring). Outline (not box-shadow) so it survives Windows High Contrast / `forced-colors` mode.
- **UX-DR16:** Implement **`<DevLatencyDisplay>`** — hidden by default, revealed via `cmd+shift+L` (FR44). `aria-hidden="true"` (developer affordance, not user feature). Shows live keystroke-to-render latency.

**Interaction patterns & flows**
- **UX-DR17:** Implement **two-cursor focus model**: capture-line caret (always in `<CaptureLine>` on desktop) + list focus ring (moves through tasks via `j`/`k`). The two cursors are independent; toggling completion on a focused row does not move the capture-line caret.
- **UX-DR18:** Implement **session-long undo stack** (`store/undo-stack.ts`) covering completion, uncompletion, edit, deletion. LIFO order. Each entry: `{ inverseMutation, timestamp }`. `u` pops; popped inverse mutation dispatched through the same `applyMutation` path as user mutations (gets idempotency key, reconciles like any other write). Stack scope: session-long (lost on reload; cross-session undo is Growth scope).
- **UX-DR19:** Implement **edit-mode behavior**: click on task text or `e` on focused row enters edit; `enter` or click-outside commits; `esc` cancels and restores original text. Whitespace-only commit treated as delete-with-undo.
- **UX-DR20:** Implement **annunciator routing**: ALL failure feedback in the app routes through `<Annunciator>`. Components do not render their own error UIs. There are no per-action error toasts, per-component error states, or modal error dialogs anywhere. Enforced by codebase grep (AR18).
- **UX-DR21:** Implement **pre-fetch capture for first-ever visit**: app shell (empty composition + cursor) renders immediately, network-independent. User can begin typing before initial fetch resolves; pre-fetch input held locally and posted on first connect.

**Accessibility specifics**
- **UX-DR22:** Verify **color contrast for both themes** via automated CSS-parse → contrast-ratio assertion in CI. Body ink on paper ≥4.5:1 (target ≥7:1 AAA where geometry allows); muted ink on paper ≥4.5:1; accent on paper ≥3:1. Both themes verified independently — no auto-inverted dark mode.
- **UX-DR23:** Implement **`prefers-contrast: more` path** as a separately-tested third composition: body ink darkens to maximum, accent saturates, rule lines move to full ink-muted. Visual-regression snapshot.
- **UX-DR24:** Implement **forced-colors / Windows High Contrast** path: outline-based focus ring (already UX-DR15), semantic color via system tokens where forced. Manual check on Windows.
- **UX-DR25:** Implement **mobile full-row tap target** for completion (≥44×44px). Tap on text region → edit mode; tap on row outside text → toggle complete. Swipe gestures explicitly disabled.

**Visual regression & quality gates**
- **UX-DR26:** Implement **visual-regression snapshot suite** at mobile / tablet / desktop viewports, both themes, all journey states (empty / populated / focused / completed / edit / annunciator-surfaced). Empty-state snapshot is the **load-bearing anti-feature regression check** (NFR-Maint-3): must contain only capture-line cursor — no chrome, no illustration, no copy.
- **UX-DR27:** Implement **automated keyboard-only E2E test** (Playwright) that completes Journeys 1, 2, 5 with no pointer input — fails if any flow becomes unreachable without a pointer (NFR-A11y-3).
- **UX-DR28:** Implement **manual screen-reader pre-ship checklist**: VoiceOver (macOS Safari + iOS Safari) and NVDA (Windows + Firefox/Edge), running Journeys 1, 2, 3, 4, 5, 6. Recorded in `docs/`.

### FR Coverage Map

*Epic-level coverage (story-level mapping appended in step-03).*

**All Functional Requirements (FR1–54) → Epic 1.** Epic 2 and Epic 3 are post-MVP scope and do not consume FRs from this PRD; new requirements for Growth and Vision will be sourced from a future PRD revision.

| FR Range | Epic | Theme |
|---|---|---|
| FR1 | Epic 1 | Single-key task add |
| FR2 | Epic 1 | Cursor pre-focused on app open (desktop) |
| FR3 | Epic 1 | Global capture shortcut (PWA-window-scoped per arch amendment) |
| FR4 | Epic 1 | Verbatim text capture (no autocorrect / autocomplete rewrite) |
| FR5 | Epic 1 | No metadata at capture time |
| FR6 | Epic 1 | Single-keystroke / single-tap completion |
| FR7 | Epic 1 | Toggle uncomplete via same gesture |
| FR8 | Epic 1 | In-place inline edit |
| FR9 | Epic 1 | Single-keystroke / single-gesture delete |
| FR10 | Epic 1 | Completed tasks remain visible in session |
| FR11 | Epic 1 | Newest-first ordering |
| FR12 | Epic 1 | Session-long undo for all destructive ops |
| FR13 | Epic 1 | Exact-state restoration on undo |
| FR14 | Epic 1 | Single asymmetric column, no headers / filter chrome |
| FR15 | Epic 1 | No checkbox at rest (focus/hover reveal only) |
| FR16 | Epic 1 | Visible + ARIA completion signal |
| FR17 | Epic 1 | Empty-state composition (no illustration / copy / onboarding) |
| FR18 | Epic 1 | Single typeface, single scale |
| FR19 | Epic 1 | Body text ≥16px (18px chosen) |
| FR20 | Epic 1 | Capture line merged into top of list |
| FR21 | Epic 1 | Cross-session persistence |
| FR22 | Epic 1 | Cache-first cold load |
| FR23 | Epic 1 | Background server reconciliation |
| FR24 | Epic 1 | Optimistic UI on mutations |
| FR25 | Epic 1 | Offline-write outbox queue |
| FR26 | Epic 1 | Idempotent replay |
| FR27 | Epic 1 | Full offline read + write |
| FR28 | Epic 1 | No skeleton / spinner / "saving…" |
| FR29 | Epic 1 | Single fixed-position annunciator on abnormal state |
| FR30 | Epic 1 | No success indicators on routine actions |
| FR31 | Epic 1 | No blocking feedback on next action |
| FR32 | Epic 1 | Keyboard navigation between tasks |
| FR33 | Epic 1 | 100% keyboard reachability for MVP ops |
| FR34 | Epic 1 | Pointer / touch parity |
| FR35 | Epic 1 | No modal dialogs for primary task ops |
| FR36 | Epic 1 | Two themes designed equally |
| FR37 | Epic 1 | Default to OS theme preference |
| FR38 | Epic 1 | User can override theme |
| FR39 | Epic 1 | Theme override persists |
| FR40 | Epic 1 | WCAG 2.1 AA contrast both themes |
| FR41 | Epic 1 | Honor `prefers-reduced-motion` |
| FR42 | Epic 1 | Semantic roles for assistive tech |
| FR43 | Epic 1 | Annunciator polite live region |
| FR44 | Epic 1 | Hidden dev-mode latency display (`cmd+shift+L`) |
| FR45 | Epic 1 | Anti-feature contract document |
| FR46 | Epic 1 | No onboarding / tour / tooltip |
| FR47 | Epic 1 | No usage stats / time tracking |
| FR48 | Epic 1 | No gamification surface |
| FR49 | Epic 1 | No leaderboard / social comparison |
| FR50 | Epic 1 | No re-engagement nudges |
| FR51 | Epic 1 | No flickering / mid-keystroke autocomplete rewrite |
| FR52 | Epic 1 | No default audible notification |
| FR53 | Epic 1 | No decorative / ambient motion |
| FR54 | Epic 1 | Deterministic ordering (no AI / inferred reordering) |

**NFR coverage:** NFR1–40 and NFR42–44 → Epic 1. NFR41 (Scale-1) explicitly deferred per PRD § Scalability.

**Additional Requirements (AR) coverage:** AR1–27 → Epic 1.

**UX Design Requirements (UX-DR) coverage:** UX-DR1–28 → Epic 1.

## Epic List

### Epic 1: Personal Todo MVP — Character-Complete v1

**Goal.** Ship a single-user, single-screen personal todo web application that delivers the *dignified absence* thesis end-to-end. After this epic, Sam can capture, complete, edit, delete, undo, and review tasks at the speed of thought; state persists across sessions; offline reads and writes work; failures surface only via a single fixed-position annunciator; both light and dark themes are independently designed to WCAG 2.1 AA; the anti-feature contract is observably honored; and CI gates enforce the latency budgets (<16ms / <50ms / <100ms p95), the bundle budget (≤50KB initial / ≤150KB total gzipped), the property-based test coverage of every destructive operation, the sync-invariant stress suite, the axe-core accessibility audit, the visual-regression on the empty state, and the codebase-grep blocking forbidden patterns.

This single-MVP-epic shape is deliberate: the v1 thesis (*"the differentiator is what the product refuses to do, with the speed of thought as a CI-enforced commitment"*) is **only validated when shipped whole**. A reduced MVP that ships "just CRUD and we'll style it later" would test the wrong question (PRD § MVP Strategy: "experience-validation MVP, not problem-validation").

Stories are sequenced by the architecture's implementation roadmap and the UX spec's six-phase plan: repository scaffold → tokens & theme bootstrap → capture loop → completion → reversibility → persistence/sync → annunciator wiring → CI gates → deploy → polish/a11y verification.

**FRs covered:** FR1–FR54 (all 54).
**NFRs covered:** NFR1–NFR40, NFR42–NFR44 (NFR41 Scale-1 deferred).
**ARs covered:** AR1–AR27 (all).
**UX-DRs covered:** UX-DR1–UX-DR28 (all).

---

### Epic 2: Growth — Daily-Driver Enhancements (post-MVP)

**Goal.** Make bmad-todo competitive as a daily-driver tool beyond the Sam archetype. Adds the productivity surfaces deliberately deferred from MVP — without violating the Quiet Tool thesis. Concretely: multi-device sync (CRDT or operational-transform over the prepared `user_namespace` seam); authentication via OAuth/OIDC lighting up the Cloudflare-Access-prepared seam (no schema rewrite required); sensible single-suggestion autocomplete from history (stable, no mid-keystroke rewrite, dismissible by ignoring); `s` to snooze; recurring tasks via double-check or explicit syntax; `/` search and filter; `f` focus-single-task; `?` shortcut overlay; user-rebindable shortcuts; mobile-tuned interaction (full-row tap target, magnified surface); settings panel (preferences only — no damage-control toggles); inline timestamp evidence on completed tasks; ambient ageing of stale tasks (deferred from MVP because the right ageing curve benefits from real usage data); cross-session undo backed by the ≥30-day server-side soft-delete retention.

**Standalone:** builds on Epic 1's idempotency-key infrastructure, soft-delete retention, per-user namespace, and Cloudflare Access auth seam. Does not require Epic 3.

**Source:** PRD § Growth Features (Post-MVP); UX spec growth-scope notes; architecture § Decision Priority Analysis (Deferred).

**FRs / NFRs covered:** *None from this PRD revision.* New requirements will be sourced from a future Growth-scope PRD revision; Epic 2 currently exists as a placeholder goal statement only.

---

### Epic 3: Vision — Long-Term Thesis Exploration (deliberately deferred)

**Goal.** Explore whether the *Quiet Tool* thesis generalizes beyond a personal todo. Candidate explorations: spatial canvas mode (positioned tasks rather than a column); DAW-style timeline view; tagging or projects (only if the thesis is preserved); multi-user / shared lists (only if it can be done without ceremony); public API / extensibility; native mobile / desktop apps.

Vision-scope items must each pass a Quiet-Tool-thesis review before promotion to a future Growth epic. Some may be deliberately killed.

**Standalone & prunable.**

**Source:** PRD § Vision (Future).

**FRs / NFRs covered:** *None from this PRD revision.* Placeholder goal statement only.

<!-- Story decomposition for Epic 1 will be appended in step-03. Epic 2 and Epic 3 receive no story decomposition in this workflow run. -->

