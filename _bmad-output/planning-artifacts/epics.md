---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories"]
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/architecture.md"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
releaseMode: "mvp-plus-post-mvp"
project_name: "bmad-todo"
user_name: "Matt"
date: "2026-04-27"
workflowType: "create-epics-and-stories"
workflowComplete: true
---

# bmad-todo - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for **bmad-todo**, decomposing the requirements from the PRD, UX Design Specification, and Architecture Decision Document into implementable stories.

The product is a single-user personal todo web application whose differentiator is **dignified absence**: calm, silent, instant, honest. Distinctiveness lives in what the product _refuses to do_ (anti-feature contract, FR46–54), in CI-enforced latency budgets (NFR-Perf-1/2/3), and in test-first rigor on every destructive operation (NFR-Maint-1, NFR-Rel-2/3).

**Release shape:** Single MVP epic delivers character-complete v1; post-MVP epics queue Growth (multi-device sync, search, snooze, etc.) and Vision scope.

## Requirements Inventory

### Functional Requirements

**Task Capture**

- **FR1:** User can add a new task by typing text and pressing a single confirmation key.
- **FR2:** User can begin typing a new task on app open without first focusing or selecting any UI element.
- **FR3:** User can add a new task from anywhere via a global capture shortcut, without first navigating to the application. _(Architecture amendment: cross-tab `cmd+enter` is PWA-window-scoped in v1; cross-tab native capture is Growth scope.)_
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
- **NFR11 (Rel-2):** Sync invariants — _never duplicate, never lose_ — hold under a 1000-operation randomized workload including simulated offline/online/conflict transitions. Verified by property-based tests in CI.
- **NFR12 (Rel-3):** Every destructive operation has a reversibility test that verifies exact-state restoration (text, position, completion status). Coverage of destructive operations by reversibility tests: **100%**.
- **NFR13 (Rel-4):** Server retains soft-deleted tasks for **≥30 days** to support cross-session recovery edge cases and future undo-beyond-session functionality.
- **NFR14 (Rel-5):** Idempotency keys on all mutations; server tolerates **≥10 retries** of the same operation without producing duplicate state. _Architecture amendment: idempotency-key TTL extended from 24h to 14 days._
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

_Technical requirements derived from the Architecture Decision Document that affect implementation order and structure._

**Repository & toolchain (Phase 1 / Foundation prerequisites — these block all other stories):**

- **AR1 (Starter Template):** Project initialized with **`create-solid` "ts" template** (plain SolidJS + Vite + TypeScript; _not_ SolidStart). Initialization is the first implementation story.
- **AR2:** **pnpm workspace monorepo** layout: `apps/web/` (SPA), `apps/api/` (Fastify), `packages/shared/` (Zod schemas + SW message types). Root `pnpm-workspace.yaml`, `tsconfig.base.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- **AR3:** **Tailwind v4** added immediately after scaffold (`@tailwindcss/vite`). Strict-token mode enforced via custom `@theme` blocks; lint rule blocks unprefixed default-palette utilities (e.g., `bg-blue-500`).
- **AR4:** **Node ≥20 LTS** (committed via `.nvmrc`); pnpm config in `.npmrc`.

**Frontend infrastructure:**

- **AR5:** **`vite-plugin-pwa`** with `injectManifest` strategy backs the service worker. Workbox modules used selectively (`precaching`, `routing`, `strategies`, `background-sync`).
- **AR6:** **`idb`** wrapper for IndexedDB; two object stores: `tasks` (cached server state + pending mutations applied) and `outbox` (FIFO mutation queue).
- **AR7:** **`uuidv7`** for all client-generated IDs (lexicographically time-ordered; `ORDER BY id DESC` ≡ `ORDER BY created_at DESC`).
- **AR8:** Service worker **must explicitly exclude `/cdn-cgi/access/*` paths** from caching (Cloudflare Access compatibility); test verifies SW does not return stale 200 on JWT expiry.
- **AR9:** Inline `<head>` theme bootstrap script reads `localStorage.theme` || `prefers-color-scheme` and sets `data-theme` attribute _before first paint_ (no flash-of-wrong-theme).

**Backend infrastructure:**

- **AR10:** **Fastify** + **Kysely** (typed SQL builder) + **better-sqlite3** + **Zod** (`fastify-type-provider-zod` for typed routes). Hand-scaffolded; no backend starter.
- **AR11:** SQLite schema via plain `.sql` migrations in `apps/api/migrations/NNNN_description.sql`, applied lexicographically at boot via custom `migrate.ts`. Tables: `tasks` (with `user_namespace`, `deleted_at` soft-delete), `idempotency_keys`, `migrations`. WAL mode enabled.
- **AR12:** **REST endpoints** (the entire API surface): `GET /tasks`, `POST /tasks`, `PATCH /tasks/:id`, `DELETE /tasks/:id`, `GET /health`. Naked-resource success responses; uniform `{ error: { code, message } }` envelope on error. Status codes: 200/201/204/400/404/409/429/5xx.
- **AR13:** **Idempotency-Key middleware** (Fastify hook): every mutating request requires `Idempotency-Key` header (UUIDv7). Server stores `(key, request_hash, response)` for **14 days** _(amendment from default 24h)_. Replay with same key returns stored response; replay with different body but same key → 409.
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

_Actionable design work items extracted from the UX Design Specification. Each is specific enough to generate a story with testable acceptance criteria._

**Design tokens & theming**

- **UX-DR1:** Implement **two complete `@theme` blocks** in `apps/web/src/styles/globals.css` — _light theme "Field Notes paper"_ (`--color-paper #F4EFE6`, `--color-ink #1F1A14`, `--color-ink-muted #1F1A1499`, `--color-rule #1F1A1422`, `--color-accent #9C3B1B` rust) and _dark theme "Reading-lamp coffee"_ (`--color-paper #1A1612`, `--color-ink #E8DFCE`, `--color-ink-muted #E8DFCE99`, `--color-rule #E8DFCE22`, `--color-accent #6B8E7F` verdigris). No additional colors (no success-green, error-red, warning-yellow). Hex values illustrative; finalize against measured contrast in implementation.
- **UX-DR2:** Implement **restrained spacing scale tokens**: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 px. Disable Tailwind's full default scale.
- **UX-DR3:** Implement **motion tokens** including an explicit `--motion-instant` token used wherever `prefers-reduced-motion: reduce` applies. Reduced-motion path must not slow perceived response (NFR9).
- **UX-DR4:** Implement **inline `<head>` theme bootstrap script** (`theme-bootstrap.ts`) that reads `localStorage.theme` || `prefers-color-scheme` and sets `data-theme` attribute _synchronously, before first paint_. No FOUC.

**Typography**

- **UX-DR5:** Self-host **Fraunces Variable** subsetted to Latin + Latin-Ext as `apps/web/public/fonts/Fraunces-VF.woff2` (~100KB). `font-display: block` for ≤200ms then `swap`. Ship only `opsz: 14` optical variant.
- **UX-DR6:** Lock **single type level** — 18px body, single weight 400, line-height 1.55, letter-spacing 0. No `font-sans`/`font-serif`/`font-mono` fallback families exposed in component code. State expression uses opacity + strike-through, not a second weight.

**Layout**

- **UX-DR7:** Implement **asymmetric column** anchored at left+96px on desktop (≥1024px), ≤640px max-width, generous right margin. Tablet (640–1024px): 64px left / 32px right margin. Mobile (<640px): full-width minus 24px each side, top margin 48px. Inter-row spacing 16px; per-row internal padding 8px top/bottom, 0 left/right.
- **UX-DR8:** Implement layout via **container queries** (`@container` on `<main>`), not viewport media queries — layout adapts to its container. Mobile-first authoring.

**Components (7-component inventory — hand-rolled, no design system library)**

- **UX-DR9:** Implement **`<App>`** — root component, owns theme attribute, focus root, global keyboard handler (`n`, `j`/`k`, `x`, `u`, `e`, `cmd+enter`, `cmd+shift+L`). Single `<main>` landmark; no `<header>`/`<nav>`/`<aside>`. `<title>` is project name only (no task counts — FR47).
- **UX-DR10:** Implement **`<TaskList>`** — semantic `<ul role="list">`, owns roving-tabindex keyboard navigation cursor. Empty state: zero children, no placeholder text. Arrow keys alias `j`/`k` for non-vim users.
- **UX-DR11:** Implement **`<TaskRow>`** with three primary states (at-rest, focused, edit) plus completed sub-state. `<input type="checkbox">` _always programmatically present_; visually suppressed at rest via `clip-path: inset(50%)` (never `display: none`). `aria-checked` reflects completion. `contenteditable="plaintext-only"` in edit mode. No truncation; long text wraps.
- **UX-DR12:** Implement **`<CaptureLine>`** — uncontrolled `<input type="text">` (DOM owns typed text; no per-keystroke framework re-render). `aria-label="Add a task"`, `autocomplete="off"`, `spellcheck="true"`, `enterkeyhint="done"`. Auto-focused on desktop mount; _not_ auto-focused on mobile (avoid summoning keyboard unbidden). Capture-line focus stickiness: `x`/`u`/`j`/`k`/theme-toggle do not steal focus.
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

_Epic-level coverage (story-level mapping appended in step-03)._

**All Functional Requirements (FR1–54) → Epic 1.** Epic 2 and Epic 3 are post-MVP scope and do not consume FRs from this PRD; new requirements for Growth and Vision will be sourced from a future PRD revision.

| FR Range | Epic   | Theme                                                          |
| -------- | ------ | -------------------------------------------------------------- |
| FR1      | Epic 1 | Single-key task add                                            |
| FR2      | Epic 1 | Cursor pre-focused on app open (desktop)                       |
| FR3      | Epic 1 | Global capture shortcut (PWA-window-scoped per arch amendment) |
| FR4      | Epic 1 | Verbatim text capture (no autocorrect / autocomplete rewrite)  |
| FR5      | Epic 1 | No metadata at capture time                                    |
| FR6      | Epic 1 | Single-keystroke / single-tap completion                       |
| FR7      | Epic 1 | Toggle uncomplete via same gesture                             |
| FR8      | Epic 1 | In-place inline edit                                           |
| FR9      | Epic 1 | Single-keystroke / single-gesture delete                       |
| FR10     | Epic 1 | Completed tasks remain visible in session                      |
| FR11     | Epic 1 | Newest-first ordering                                          |
| FR12     | Epic 1 | Session-long undo for all destructive ops                      |
| FR13     | Epic 1 | Exact-state restoration on undo                                |
| FR14     | Epic 1 | Single asymmetric column, no headers / filter chrome           |
| FR15     | Epic 1 | No checkbox at rest (focus/hover reveal only)                  |
| FR16     | Epic 1 | Visible + ARIA completion signal                               |
| FR17     | Epic 1 | Empty-state composition (no illustration / copy / onboarding)  |
| FR18     | Epic 1 | Single typeface, single scale                                  |
| FR19     | Epic 1 | Body text ≥16px (18px chosen)                                  |
| FR20     | Epic 1 | Capture line merged into top of list                           |
| FR21     | Epic 1 | Cross-session persistence                                      |
| FR22     | Epic 1 | Cache-first cold load                                          |
| FR23     | Epic 1 | Background server reconciliation                               |
| FR24     | Epic 1 | Optimistic UI on mutations                                     |
| FR25     | Epic 1 | Offline-write outbox queue                                     |
| FR26     | Epic 1 | Idempotent replay                                              |
| FR27     | Epic 1 | Full offline read + write                                      |
| FR28     | Epic 1 | No skeleton / spinner / "saving…"                              |
| FR29     | Epic 1 | Single fixed-position annunciator on abnormal state            |
| FR30     | Epic 1 | No success indicators on routine actions                       |
| FR31     | Epic 1 | No blocking feedback on next action                            |
| FR32     | Epic 1 | Keyboard navigation between tasks                              |
| FR33     | Epic 1 | 100% keyboard reachability for MVP ops                         |
| FR34     | Epic 1 | Pointer / touch parity                                         |
| FR35     | Epic 1 | No modal dialogs for primary task ops                          |
| FR36     | Epic 1 | Two themes designed equally                                    |
| FR37     | Epic 1 | Default to OS theme preference                                 |
| FR38     | Epic 1 | User can override theme                                        |
| FR39     | Epic 1 | Theme override persists                                        |
| FR40     | Epic 1 | WCAG 2.1 AA contrast both themes                               |
| FR41     | Epic 1 | Honor `prefers-reduced-motion`                                 |
| FR42     | Epic 1 | Semantic roles for assistive tech                              |
| FR43     | Epic 1 | Annunciator polite live region                                 |
| FR44     | Epic 1 | Hidden dev-mode latency display (`cmd+shift+L`)                |
| FR45     | Epic 1 | Anti-feature contract document                                 |
| FR46     | Epic 1 | No onboarding / tour / tooltip                                 |
| FR47     | Epic 1 | No usage stats / time tracking                                 |
| FR48     | Epic 1 | No gamification surface                                        |
| FR49     | Epic 1 | No leaderboard / social comparison                             |
| FR50     | Epic 1 | No re-engagement nudges                                        |
| FR51     | Epic 1 | No flickering / mid-keystroke autocomplete rewrite             |
| FR52     | Epic 1 | No default audible notification                                |
| FR53     | Epic 1 | No decorative / ambient motion                                 |
| FR54     | Epic 1 | Deterministic ordering (no AI / inferred reordering)           |

**NFR coverage:** NFR1–40 and NFR42–44 → Epic 1. NFR41 (Scale-1) explicitly deferred per PRD § Scalability.

**Additional Requirements (AR) coverage:** AR1–27 → Epic 1.

**UX Design Requirements (UX-DR) coverage:** UX-DR1–28 → Epic 1.

## Epic List

### Epic 1: Personal Todo MVP — Character-Complete v1

**Goal.** Ship a single-user, single-screen personal todo web application that delivers the _dignified absence_ thesis end-to-end. After this epic, Sam can capture, complete, edit, delete, undo, and review tasks at the speed of thought; state persists across sessions; offline reads and writes work; failures surface only via a single fixed-position annunciator; both light and dark themes are independently designed to WCAG 2.1 AA; the anti-feature contract is observably honored; and CI gates enforce the latency budgets (<16ms / <50ms / <100ms p95), the bundle budget (≤50KB initial / ≤150KB total gzipped), the property-based test coverage of every destructive operation, the sync-invariant stress suite, the axe-core accessibility audit, the visual-regression on the empty state, and the codebase-grep blocking forbidden patterns.

This single-MVP-epic shape is deliberate: the v1 thesis (_"the differentiator is what the product refuses to do, with the speed of thought as a CI-enforced commitment"_) is **only validated when shipped whole**. A reduced MVP that ships "just CRUD and we'll style it later" would test the wrong question (PRD § MVP Strategy: "experience-validation MVP, not problem-validation").

Stories are sequenced by the architecture's implementation roadmap and the UX spec's six-phase plan: repository scaffold → tokens & theme bootstrap → capture loop → completion → reversibility → persistence/sync → annunciator wiring → CI gates → deploy → polish/a11y verification.

**FRs covered:** FR1–FR54 plus FR55 (shortcut overlay promoted into MVP).
**NFRs covered:** NFR1–NFR40, NFR42–NFR44 (NFR41 Scale-1 deferred).
**ARs covered:** AR1–AR27 (all).
**UX-DRs covered:** UX-DR1–UX-DR28 (all).

---

### Epic 2: Growth — Daily-Driver Enhancements (post-MVP)

**Goal.** Make bmad-todo competitive as a daily-driver tool beyond the Sam archetype. Adds the productivity surfaces deliberately deferred from MVP — without violating the Quiet Tool thesis. Concretely: multi-device sync (CRDT or operational-transform over the prepared `user_namespace` seam); authentication via OAuth/OIDC lighting up the Cloudflare-Access-prepared seam (no schema rewrite required); sensible single-suggestion autocomplete from history (stable, no mid-keystroke rewrite, dismissible by ignoring); `s` to snooze; recurring tasks via double-check or explicit syntax; `/` search and filter; `f` focus-single-task; user-rebindable shortcuts; mobile-tuned interaction (full-row tap target, magnified surface); settings panel (preferences only — no damage-control toggles); inline timestamp evidence on completed tasks; ambient ageing of stale tasks (deferred from MVP because the right ageing curve benefits from real usage data); cross-session undo backed by the ≥30-day server-side soft-delete retention.

**Standalone:** builds on Epic 1's idempotency-key infrastructure, soft-delete retention, per-user namespace, and Cloudflare Access auth seam. Does not require Epic 3.

**Source:** PRD § Growth Features (Post-MVP); UX spec growth-scope notes; architecture § Decision Priority Analysis (Deferred).

**FRs / NFRs covered:** _None from this PRD revision._ New requirements will be sourced from a future Growth-scope PRD revision; Epic 2 currently exists as a placeholder goal statement only.

---

### Epic 3: Vision — Long-Term Thesis Exploration (deliberately deferred)

**Goal.** Explore whether the _Quiet Tool_ thesis generalizes beyond a personal todo. Candidate explorations: spatial canvas mode (positioned tasks rather than a column); DAW-style timeline view; tagging or projects (only if the thesis is preserved); multi-user / shared lists (only if it can be done without ceremony); public API / extensibility; native mobile / desktop apps.

Vision-scope items must each pass a Quiet-Tool-thesis review before promotion to a future Growth epic. Some may be deliberately killed.

**Standalone & prunable.**

**Source:** PRD § Vision (Future).

**FRs / NFRs covered:** _None from this PRD revision._ Placeholder goal statement only.

<!-- Story decomposition for Epic 1 appended in step-03. Epic 2 and Epic 3 receive no story decomposition in this workflow run. -->

## Epic 1: Personal Todo MVP — Character-Complete v1

### Story 1.1: Repository Scaffold and CI Foundation

As a developer,
I want a correctly configured monorepo with type-checking, linting, and CI skeleton in place,
So that every subsequent story is built on a known, reproducible foundation with quality gates from day one.

**Acceptance Criteria:**

**Given** the repository is cloned,
**When** `pnpm install && pnpm build` runs,
**Then** both `apps/web` (Vite + React 18 + TypeScript strict) and `apps/server` (Fastify + TypeScript strict) compile without errors.

**Given** the app is started,
**When** `GET /health` is called on the server,
**Then** it returns HTTP 200.

**Given** a PR is opened,
**When** CI runs,
**Then** type-check, lint, test, and bundle-size steps all run; any failure blocks merge.

**Given** the initial JS bundle is built,
**When** the bundle-size gate runs,
**Then** the CI step records initial bundle size (placeholder threshold; tightened as features land — final enforced limits are ≤50KB initial / ≤150KB total gzipped per NFR6).

**Given** Playwright is installed,
**When** the smoke test suite runs,
**Then** at least one end-to-end smoke test passes against the running app.

**And** all workspace scripts (`dev`, `build`, `test`, `typecheck`, `lint`) are documented in the root README.

---

### Story 1.2: Design Tokens, Theme Bootstrap & Typography

As Sam,
I want the application to load with the correct visual theme and typography without any flash of wrong appearance,
So that first impressions of the app are calm and consistent regardless of my OS preference.

**Acceptance Criteria:**

**Given** the user has no stored theme preference and OS prefers dark mode,
**When** the app loads,
**Then** `data-theme="dark"` is set on `<html>` synchronously before first paint with no flash of unstyled content (FOUC).

**Given** the user has `localStorage.theme = "light"` in a dark-preference OS,
**When** the app loads,
**Then** `data-theme="light"` is applied (user override wins over OS preference).

**Given** both themes are defined,
**When** the light theme is active,
**Then** `--color-paper: #F4EFE6`, `--color-ink: #1F1A14`, `--color-ink-muted: rgba(31,26,20,.6)`, `--color-rule: rgba(31,26,20,.133)`, `--color-accent: #9C3B1B` are applied.

**Given** both themes are defined,
**When** the dark theme is active,
**Then** `--color-paper: #1A1612`, `--color-ink: #E8DFCE`, `--color-ink-muted: rgba(232,223,206,.6)`, `--color-rule: rgba(232,223,206,.133)`, `--color-accent: #6B8E7F` are applied.

**Given** the app is rendered,
**When** any text element is inspected,
**Then** body font is Fraunces Variable (self-hosted at `apps/web/public/fonts/Fraunces-VF.woff2`, subset Latin+Latin-Ext, `font-display: block`), 18px, weight 400, line-height 1.55, letter-spacing 0; no other font families are used in component code.

**And** spacing scale tokens are defined (4/8/12/16/24/32/48/64/96px); Tailwind's default spacing scale is disabled.
**And** `--motion-instant: 0ms` token is defined and applied on the `prefers-reduced-motion: reduce` path; no other animation runs under that preference.
**And** a visual-regression snapshot of the blank screen passes for both light and dark themes.

---

### Story 1.3: Task Capture Loop and Empty State

As Sam,
I want to open the app and immediately type a new task that appears in my list when I press Enter,
So that task capture requires zero navigation, zero clicks, and zero extra fields.

**Acceptance Criteria:**

**Given** the app is open on desktop,
**When** the page loads,
**Then** the CaptureLine `<input>` has focus automatically; no click is required.

**Given** the CaptureLine has focus,
**When** Sam types text and presses Enter,
**Then** a new TaskRow appears at the top of the list containing exactly the typed text; CaptureLine clears and immediately retakes focus.

**Given** Enter is pressed to add a task,
**When** the task appears,
**Then** no spinner, skeleton, or "saving…" indicator is shown at any point.

**Given** no tasks exist,
**When** the app renders,
**Then** only the CaptureLine is visible on a generous canvas; no illustration, motivational copy, placeholder text, or onboarding content is present.

**Given** two or more tasks exist,
**When** a new task is added,
**Then** it appears at position 1 (top); all existing tasks shift down, preserving newest-first order.

**Given** the app is viewed at any viewport,
**When** the layout renders,
**Then** an asymmetric single column is applied via container queries (`@container` on `<main>`): left+96px on desktop (≥1024px), ≤640px max-width; 64px/32px margins on tablet; 24px each side on mobile.

**And** CaptureLine is an uncontrolled `<input type="text">` (DOM owns typed text; no per-keystroke React re-render); `aria-label="Add a task"`, `autocomplete="off"`, `spellcheck="true"`, `enterkeyhint="done"`.
**And** text is captured verbatim; no auto-correction, auto-formatting, or rewriting is applied.
**And** state is in-memory only this story; persistence is added in Story 1.9.

---

### Story 1.4: Task Completion, Visual State & Tick Component

As Sam,
I want to mark a task done with a single keypress or tap and see it visually acknowledged without any spinner or confirmation dialog,
So that completing tasks feels instant and unobtrusive.

**Acceptance Criteria:**

**Given** a TaskRow has list focus,
**When** Sam presses `X`,
**Then** the task toggles between active and completed states.

**Given** a TaskRow is visible,
**When** Sam clicks or taps the row outside the text region,
**Then** the task toggles completion state.

**Given** a task is completed,
**Then** it displays strikethrough text and reduced opacity; `aria-checked="true"` is set on its checkbox element; a Tick SVG appears.

**Given** a task is active and at rest (no focus, no hover),
**Then** no checkbox or completion affordance is visible (hidden via `clip-path: inset(50%)`); the affordance appears on focus or hover.

**Given** any completion toggle occurs,
**Then** no spinner, saving indicator, or success toast appears.

**Given** two different tasks are completed,
**When** their Tick components are rendered,
**Then** the two SVG paths are not pixel-identical (Bezier control-point jitter of ±0.4px seeded by task id, stable across re-completions); both use `stroke: --color-accent`, `stroke-width: 2.2px`, round line-cap and line-join; `aria-hidden="true"`.

**And** completed tasks remain visible in the list for the duration of the session; nothing is hidden, archived, or removed automatically.

---

### Story 1.5: Task Edit and Delete

As Sam,
I want to edit a task's text in place and delete tasks with a single keystroke — without leaving the list view or seeing any confirmation dialog,
So that corrections and cleanup have zero ceremony.

**Acceptance Criteria:**

**Given** a TaskRow has list focus,
**When** Sam presses `E`,
**Then** the row enters edit mode (`contenteditable="plaintext-only"` activated on the text region).

**Given** a TaskRow is visible,
**When** Sam clicks or taps the task text region,
**Then** the row enters edit mode.

**Given** edit mode is active,
**When** Sam presses Enter or clicks outside the row,
**Then** the edit is committed; the task displays the updated text.

**Given** edit mode is active,
**When** Sam presses Escape,
**Then** the edit is cancelled; the original text is fully restored.

**Given** edit mode is committed with whitespace-only text,
**Then** the task is deleted and an undo entry is pushed to the stack (treated as delete-with-undo, not an empty save).

**Given** a TaskRow has list focus,
**When** Sam presses `D`,
**Then** the task is removed from the list; the action is undoable.

**Given** any edit or delete action,
**Then** no modal dialog, confirmation prompt, or blocking overlay appears; the operation completes in place without leaving the list view.

---

### Story 1.6: Session-Long Undo Stack

As Sam,
I want to undo any action — completion toggle, edit, or deletion — during my session,
So that mistakes are instantly reversible without fear.

**Acceptance Criteria:**

**Given** Sam has toggled completion on a task,
**When** Sam presses `U`,
**Then** the task returns to its prior completion state with its original text and position intact.

**Given** Sam has edited a task,
**When** Sam presses `U`,
**Then** the task text is restored to its pre-edit value.

**Given** Sam has deleted a task,
**When** Sam presses `U`,
**Then** the task reappears at its original position in the list with its original text and completion status.

**Given** multiple actions have been taken,
**When** Sam presses `U` repeatedly,
**Then** actions are undone in reverse order (LIFO); each press undoes exactly one action.

**Given** Sam presses `U` with an empty undo stack,
**Then** nothing happens; no error or feedback is shown.

**And** the undo stack is session-scoped (lost on page reload; cross-session undo is Growth scope).
**And** each stack entry stores `{ inverseMutation, timestamp }`.
**And** popped inverse mutations travel through the same `applyMutation` path as user mutations (idempotency-safe once persistence lands in Story 1.9).
**And** 100% of destructive operations (complete, uncomplete, edit, delete) have reversibility tests verifying exact-state restoration: text, position, and completion status.

---

### Story 1.7: Keyboard Navigation and Two-Cursor Focus Model

As Sam,
I want to navigate and operate every task action from the keyboard alone, with a clear visual focus ring,
So that I never need to reach for the mouse to manage my tasks.

**Acceptance Criteria:**

**Given** the app is open,
**When** Sam presses `J` or `ArrowDown`,
**Then** list focus moves to the next task down.

**Given** the app is open,
**When** Sam presses `K` or `ArrowUp`,
**Then** list focus moves to the next task up.

**Given** list focus is on a task,
**When** Sam presses `X`, `E`, `D`, or `U`,
**Then** the respective operation (toggle complete, edit, delete, undo) executes.

**Given** the app is open,
**When** Sam presses `N` or `Cmd+Enter`,
**Then** CaptureLine receives focus.

**Given** CaptureLine is focused,
**When** Sam presses `X`, `U`, `J`, `K`, or activates the theme toggle,
**Then** focus does not move away from CaptureLine (capture-line focus stickiness).

**Given** list focus is on a task and the CaptureLine has its cursor,
**When** Sam toggles completion on the focused row,
**Then** the CaptureLine caret position is unaffected (two cursors are independent).

**Given** any interactive element receives focus via keyboard,
**Then** a 2px solid `--color-accent` outline with 4px offset and border-radius 2px appears on `:focus-visible` only (not `:focus` alone); the ring uses `outline` (not `box-shadow`) to survive `forced-colors` mode.

**And** TaskList uses roving tabindex; each TaskRow is a tab stop reachable by Tab and by `J`/`K`.
**And** a Playwright keyboard-only E2E test completes Journeys 1 (add task), 2 (complete task), and 5 (undo delete) with zero pointer events.

---

### Story 1.8: Theme Toggle, Dark Mode & Accessibility Tokens

As Sam,
I want to toggle between light and dark themes with my preference remembered across sessions, and for the app to always meet accessibility contrast requirements,
So that I can use the app comfortably in any lighting condition and with any assistive technology.

**Acceptance Criteria:**

**Given** the theme toggle is activated (keyboard-accessible; `T` key or focusable button),
**When** Sam triggers it,
**Then** the theme switches between light and dark; `data-theme` on `<html>` updates immediately with no FOUC.

**Given** Sam has switched the theme,
**When** Sam closes and reopens the app,
**Then** the previously selected theme is applied (`localStorage.theme` persisted).

**Given** OS preference is dark and no override is stored,
**When** Sam first opens the app,
**Then** dark theme is active.

**Given** both themes are active (separately),
**When** contrast CI assertions run,
**Then** body ink on paper ≥4.5:1; muted ink on paper ≥4.5:1; accent on paper ≥3:1 — both themes pass independently.

**Given** `prefers-reduced-motion: reduce` is set,
**When** any animation or transition would occur,
**Then** `--motion-instant (0ms)` is substituted; no animation runs; p95 latency budgets remain within their thresholds.

**Given** `prefers-contrast: more` is set,
**Then** body ink darkens to maximum contrast, accent saturates, rule lines use full ink-muted; a visual-regression snapshot for this composition passes.

**Given** `forced-colors` / Windows High Contrast mode is active,
**Then** the focus ring uses `outline` (not `box-shadow`) and is visible; semantic system color tokens are applied where forced.

**And** on mobile viewports, each TaskRow's tap target is ≥44×44px; tap on text region → edit mode; tap outside text region → toggle completion.

---

### Story 1.9: Cross-Session Persistence and Offline-First Sync

As Sam,
I want my tasks to be available every time I open the app — even offline — and to never see a loading spinner for any action I take,
So that the app feels instant and trustworthy regardless of my network state.

**Acceptance Criteria:**

**Given** Sam has tasks from a previous session,
**When** the app opens,
**Then** tasks render from local cache (IndexedDB) before any network response arrives; no skeleton, spinner, or placeholder is displayed.

**Given** Sam adds, completes, edits, or deletes a task while online,
**When** the action is taken,
**Then** the UI updates synchronously (optimistic mutation); server sync happens in the background with no visible indicator of any kind.

**Given** Sam performs actions while offline,
**When** each action is taken,
**Then** it applies to local state immediately and is queued in the outbox.

**Given** connectivity is restored after an offline period,
**When** sync begins,
**Then** queued mutations replay against the server in order; on completion the local state reflects the authoritative server state.

**Given** a mutation is retried due to transient failure,
**When** it is retried ≥10 times,
**Then** the server produces no duplicate state (idempotency key on each mutation; TTL 14 days).

**Given** the server and local state diverge (conflict),
**When** reconciliation runs,
**Then** the Annunciator is notified (wired fully in Story 1.10); local state is never silently overwritten without surfacing the conflict.

**And** PostgreSQL schema: `tasks` table (`id`, `user_namespace`, `text`, `completed`, `position`, `created_at`, `updated_at`, `deleted_at` for soft-delete); `idempotency_keys` table (`key`, `result`, `created_at`).
**And** Fastify API: `POST /tasks`, `GET /tasks`, `PATCH /tasks/:id`, `DELETE /tasks/:id` (soft-delete); all routes partitioned by `user_namespace`; idempotency key header accepted on all mutation routes.
**And** server retains soft-deleted tasks for ≥30 days.
**And** property-based test: 1000-op randomized workload with simulated offline/online/conflict transitions verifies never-duplicate and never-lose invariants; runs in CI.

---

### Story 1.10: Annunciator and Failure Feedback Routing

As Sam,
I want to be informed of sync problems through a single subtle indicator — and never see success confirmations for normal actions,
So that the UI stays quiet and I only notice the dot when something genuinely needs my attention.

**Acceptance Criteria:**

**Given** the app is in normal operating state,
**Then** the Annunciator is not visible (`display: none`); no status dot, badge, or indicator of any kind is shown.

**Given** the app has been offline for more than 2 seconds,
**When** the Annunciator threshold is crossed,
**Then** a single 12px circular dot in `--color-accent` appears fixed-position at bottom-right (24px from each edge); `role="status"` and `aria-live="polite"` are present.

**Given** a sync conflict is detected,
**Then** the Annunciator dot appears; hovering or focusing it reveals a contextual label; clicking it triggers a recovery action.

**Given** a storage error occurs,
**Then** the Annunciator dot appears with the same treatment.

**Given** a momentary network blip resolves within 2 seconds,
**Then** the Annunciator never becomes visible (2-second transient threshold suppresses brief interruptions).

**Given** connectivity is restored and sync completes successfully,
**When** the normal state is re-established,
**Then** the Annunciator disappears.

**Given** any routine user action (add, complete, edit, delete, undo),
**Then** no success toast, banner, modal, or animation appears confirming the action.

**And** ALL failure feedback in the app routes through Annunciator; no component renders its own error UI; no per-action error toasts; no modal error dialogs; enforced by codebase grep blocking forbidden patterns (AR18).
**And** Annunciator never: flashes red, plays sound, animates for decorative purposes, or displays a success state.

---

### Story 1.11: Dev Mode Latency Display & Anti-Feature Contract

As a developer,
I want a hidden in-browser latency display and a published anti-feature contract that makes the product's commitments explicit,
So that performance regressions are immediately visible and the design constraints are a first-class repository artifact.

**Acceptance Criteria:**

**Given** the app is open,
**When** the developer presses `Cmd+Shift+L`,
**Then** a DevLatencyDisplay overlay appears showing live p95 keystroke-to-render and completion-gesture-to-strikethrough latency versus their respective budgets (<16ms and <50ms).

**Given** DevLatencyDisplay is visible,
**When** `Cmd+Shift+L` is pressed again,
**Then** the overlay is hidden.

**Given** DevLatencyDisplay is visible,
**When** Sam types in CaptureLine,
**Then** the latency display updates in real time with the measured latency.

**And** DevLatencyDisplay has `aria-hidden="true"` (developer affordance, not a user feature).

**Given** the repository,
**When** `docs/ANTI-FEATURES.md` is read,
**Then** it explicitly enumerates FR46–54 as observable commitments: no onboarding tour; no usage statistics; no gamification; no leaderboard; no re-engagement notifications; no mid-keystroke autocomplete rewrite; no default audible notification; no decorative/ambient motion; no AI-based task reordering.

**And** `README.md` states the three p95 latency budgets (<16ms / <50ms / <100ms) and links to `ANTI-FEATURES.md`.
**And** `docs/CONTRIBUTING.md` references `ANTI-FEATURES.md` as required reading before submitting a PR.

---

### Story 1.12: CI Performance, Accessibility & Visual-Regression Gates

As a developer,
I want every CI run to enforce the product's quality commitments — latency, bundle size, accessibility, contrast, and visual regression — so that no PR can ship a regression silently,
So that the product's budgets are a living contract enforced by the build pipeline.

**Acceptance Criteria:**

**Given** a PR is opened,
**When** the latency CI gate runs,
**Then** p95 keystroke-to-render <16ms (NFR1), p95 completion-to-strikethrough <50ms (NFR2), and p95 enter-to-task-visible <100ms (NFR3) are each asserted; any regression fails the build.

**Given** a PR is opened,
**When** the bundle-size gate runs,
**Then** initial JS bundle ≤50KB gzipped and total bundle ≤150KB gzipped are asserted; any regression fails the build.

**Given** a PR is opened,
**When** the axe-core accessibility audit runs against the rendered app,
**Then** zero Level AA violations are reported; any violation fails the build.

**Given** both themes are evaluated,
**When** the contrast assertion test runs,
**Then** body ink on paper ≥4.5:1, muted ink ≥4.5:1, accent ≥3:1 are each asserted for both light and dark themes independently; any failure fails the build.

**Given** the keyboard-only E2E Playwright test runs,
**When** it exercises Journeys 1 (add task), 2 (complete task), and 5 (undo delete),
**Then** all three journeys complete successfully with zero pointer events; any pointer dependency fails the test.

**Given** visual-regression snapshots are run,
**When** the suite covers mobile/tablet/desktop viewports × both themes × all journey states (empty, populated, focused, completed, edit, annunciator-surfaced),
**Then** all snapshots match baselines; the empty-state snapshot contains only the capture-line cursor (no chrome, illustration, copy) — the load-bearing anti-feature regression check.

**And** the property-based sync test (1000-op workload, offline/online/conflict) runs in CI; any never-duplicate or never-lose invariant violation fails the build.
**And** the `prefers-reduced-motion` path is covered: latency budgets hold under reduced-motion; tests run with the preference emulated.
**And** `docs/` contains a manual screen-reader pre-ship checklist for VoiceOver (macOS Safari + iOS Safari) and NVDA (Windows Firefox/Edge) covering Journeys 1–6.

---

### Story 1.13: Deployment, Security Headers & Production Hardening

As Sam,
I want the app deployed to a production environment with HTTPS, security headers, and no search-engine indexing,
So that my task data is private, the app is accessible from any browser, and the infrastructure is production-grade from day one.

**Acceptance Criteria:**

**Given** the app is deployed to Fly.io,
**When** `GET /health` is called,
**Then** it returns HTTP 200 with no sensitive data; the check is registered in `fly.toml` `[checks]`.

**Given** any HTTP request is made to the app,
**When** it arrives over plain HTTP,
**Then** it is redirected to HTTPS; HSTS header is present on all HTTPS responses.

**Given** any response from the server,
**Then** it includes: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.

**Given** the web app is loaded,
**When** the HTML is inspected,
**Then** `<meta name="robots" content="noindex, nofollow">` is present in `<head>`.

**Given** a CORS request is made from an unauthorized origin in production,
**Then** it is rejected; no wildcard CORS is present in the production config.

**Given** the server starts,
**When** the startup sequence runs,
**Then** database migrations execute to completion before `app.listen` is called.

**And** `fly.toml` is configured: single region, persistent volume mount for PostgreSQL data, `[checks]` pointing to `/health` (AR25).
**And** all task data is partitioned by `user_namespace`; cross-user data leakage is prevented by query-level scoping.
**And** task text is never logged in plaintext server-side beyond what storage requires.
**And** no third-party analytics, tracking pixels, advertising SDKs, or session-replay tooling is present in the deployed build.
**And** the deployment pipeline is: CI gates pass (Story 1.12) → build → deploy; no manual steps beyond initial approval.

### Story 1.14: Keyboard Shortcut Overlay (`?` Lookup Surface)

As Sam,
I want to press `?` to see every keyboard shortcut and its action,
So that I can look up a shortcut on demand without leaving the keyboard, reading the README, or relying on a persistent on-screen help affordance that would soften the no-chrome stance.

**Acceptance Criteria:**

**Given** no editable target has DOM focus,
**When** Sam presses `?`,
**Then** a centered modal overlay appears listing every global shortcut (`n`, `j`/`k`, `ArrowDown`/`ArrowUp`, `x`, `e`, `d`, `u`, `t`, `Cmd+Enter`/`Ctrl+Enter`, `Escape`, `?`) paired with its action; the overlay is the only newly visible UI element; the rest of the screen remains visible (or dimmed via a low-contrast scrim consistent with theme tokens — no opaque blackout).

**Given** the overlay is open,
**When** Sam presses `Escape` or presses `?` again,
**Then** the overlay closes and `document.activeElement` is restored to whatever held focus before the overlay opened (capture-line stickiness preserved per UX spec line 400).

**Given** Sam is typing in the capture line or editing a task,
**When** Sam presses `?`,
**Then** the overlay does NOT open; the `?` character is inserted into the contenteditable/input as a literal character (gated by the same `isEditableTarget` check as all other Story 1.7 shortcuts).

**Given** the overlay is open,
**When** Sam presses any other shortcut key (`x`, `j`, `t`, etc.),
**Then** the global handler does NOT fire that shortcut (the overlay traps shortcut handling); only `Escape` and `?` close the overlay; `Tab` moves focus within the overlay (focus trap).

**Given** the overlay is rendered,
**Then** it has `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` referencing a heading inside the overlay; opening the overlay moves DOM focus to the dialog (or its first interactive element if any); closing the overlay restores focus per the prior AC.

**Given** the overlay is rendered,
**Then** every shortcut row uses semantic markup (a `<dl>` of `<dt>` keys / `<dd>` actions, or a `<table>`) so the list is consumable by assistive technology in reading order; the `<kbd>` element is used for each key glyph.

**Given** the overlay is rendered under either theme,
**Then** body text contrast on the overlay background meets WCAG 2.1 AA (≥4.5:1) and is verified by a contrast assertion in `design-tokens.test.ts`; under `prefers-contrast: more` the contrast meets the same ≥7:1 / ≥4.5:1 thresholds as the rest of the app.

**Given** the overlay is rendered under `forced-colors: active`,
**Then** the dialog uses system color tokens (`Canvas`, `CanvasText`, `Highlight` for any focusable element's focus ring) and remains fully legible; verified by a Playwright visual-regression snapshot.

**Given** the overlay is rendered under `prefers-reduced-motion: reduce`,
**Then** the open and close transitions are instant (`--motion-default` resolves to `0ms`); no animation runs.

**And** there is no persistent on-screen text indicating the `?` shortcut. The trigger is undocumented in the UI; the README documents it. (Anti-pattern explicitly avoided per UX spec § Keyboard-Discoverability Pattern.)

**And** the overlay is dismissible by pointer too: clicking outside the dialog (on the scrim) closes the overlay; the close-on-outside-click path does NOT change `document.activeElement` away from the prior focus holder (same constraint as the theme-toggle button per Story 1.8 AC#9–10).

**And** opening the overlay never auto-opens at load, never auto-opens on first-ever visit, and never opens via any path other than the explicit `?` keystroke or pointer activation of the overlay's own (optional) `<button>` close affordance — there is no first-time-user auto-walkthrough (FR46).

**And** anti-feature lints (NFR-Maint-3) extend to forbid: `tooltip`, `onboarding`, `walkthrough`, and any persistent "Press `?` for help" string in the rendered DOM.
