---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - 'docs/Product Requirement Document (PRD) for the Todo App.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/planning-artifacts/ux-design-directions.html'
  - '_bmad-output/brainstorming/brainstorming-session-2026-04-27-1709.md'
workflowType: 'architecture'
project_name: 'bmad-todo'
user_name: 'Matt'
date: '2026-04-27'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (54 total, 9 categories):**
The product is functionally narrow — a single-screen task list with add/complete/uncomplete/edit/delete/undo, plus capture-anywhere, theming, and an annunciator failure surface. The architectural surface area is dominated not by feature count but by the **anti-feature contract** (FR46–54), which mandates the *absence* of common productivity-app patterns (toasts, spinners, modals, gamification, telemetry, mid-keystroke autocomplete, decorative motion). Architecturally this means: no toast/notification subsystem, no skeleton/loading state machinery, no analytics pipeline, no client-side telemetry, and a single failure-feedback surface (`<Annunciator>`) that all subsystems route into.

**Non-Functional Requirements (31 total) — load-bearing for architecture:**
- *Performance:* CI-enforced p95 latency budgets (16/50/100ms) and bundle budgets (50KB initial / 150KB total gzipped) constrain framework choice, render strategy, and the persistence read path. The cache-first read path is mandatory — no architecture that depends on a network round-trip for first paint after the first-ever visit can satisfy NFR-Perf-4.
- *Reliability:* Sync must hold "never duplicate, never lose" under 1000-op stress with offline transitions; idempotency keys on every mutation; outbox preserves order across reconnect; soft-delete with ≥30-day server retention.
- *Accessibility:* WCAG 2.1 AA verified by axe-core in CI; the "no checkbox at rest" pattern requires the visually-suppressed-but-semantically-present checkbox idiom.
- *Privacy/Security:* per-user namespace from day one despite single-user v1; plain-text-only rendering (no HTML/markdown evaluation); HTTPS+HSTS; deploy access-restricted at network/transport layer in v1; clean seam for future OAuth/OIDC auth.
- *Maintainability:* anti-feature regressions caught by visual-regression on empty state plus codebase grep for forbidden patterns (analytics SDKs, gamification keywords, blocking-animation patterns); full test suite <5 min CI.

**Scale & Complexity:**
- Primary domain: full-stack web (SPA + REST + PWA-installable), single-screen, single-user
- Functional complexity: low (narrow feature set, deliberate)
- Engineering discipline: elevated — latency budgets, sync correctness, and anti-feature drift are first-class architectural concerns
- Estimated architectural components: ~7 frontend components (locked in UX spec), ~4 backend endpoints, 1 database with a narrow schema, 1 service worker with outbox + cache, 1 perf-test harness, 1 property-based test harness

### Technical Constraints & Dependencies

**Hard constraints from PRD/UX (not negotiable in this workflow):**
- Bundle ≤50KB initial / ≤150KB total gzipped (NFR-Perf-6) — likely rules out React/Vue at the framework layer; favors Solid, Svelte, Preact, or hand-rolled vanilla
- Service worker is required (cache + offline outbox) — not optional
- IndexedDB is required for the cache; OPFS may be considered but is not currently mandated
- Tailwind v4 in strict-token mode — established in UX spec (Step 6); not relitigated here
- Fraunces variable serif self-hosted (~100KB woff2 subsetted) is the working assumption from UX spec
- 7-component inventory locked in UX spec; component additions are out of scope for v1
- Browser support: Chrome/Edge/Brave/Arc/Firefox last-2, Safari 16.4+, Mobile Safari 16.4+, Chrome Android last-2

**Open at the architecture layer:**
- Reactive framework selection (Solid / Svelte / Preact / vanilla) — must satisfy bundle budget AND <16ms keystroke→render under 1000-row workload
- Backend runtime + persistence (Node/Bun/Deno/Go vs SQLite/Postgres)
- Build pipeline / dev server
- Perf-test harness implementation (Playwright + custom timing? Lighthouse CI? something else)
- Property-based test framework (fast-check / hypothesis-equivalent / hand-rolled)
- Monorepo vs split repos
- Deployment topology and access-restriction mechanism for v1

### Cross-Cutting Concerns Identified

1. **Latency instrumentation** — must be present in dev mode (FR44), enforced in CI (NFR-Perf-8), and architecturally non-blocking in production. Affects framework choice, build pipeline, test harness.
2. **Sync correctness (outbox + cache + reconciliation)** — touches frontend, service worker, backend, and database. Idempotency keys are the load-bearing primitive; soft-delete is the load-bearing server-side mechanism.
3. **Accessibility under design restraint** — every "no chrome at rest" decision in the UX spec creates a corresponding a11y obligation. The architecture must preserve semantic structure even when visual structure is suppressed.
4. **Anti-feature drift prevention** — must surface in build/test pipeline (visual-regression, codebase grep, lint rules). Affects CI design, repository conventions, and contributor workflow.
5. **Theming** — two independently-designed themes via inline-script attribute setter (no FOUC). Affects asset loading order and CSS architecture.
6. **Per-user namespacing without auth** — v1 has no auth but data model includes user namespace; affects schema design and API shape.
7. **Test discipline as first-class infrastructure** — property-based tests, sync invariant stress tests, latency CI tests, axe-core a11y, visual regression. The test harness is architecturally significant, not an afterthought.
8. **Offline-as-default-mode** — every mutation path must work without a network connection; affects every layer of the frontend stack.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web SPA + thin REST backend, PWA-installable, single-screen. Browser-side: SolidJS + Vite + Tailwind v4 strict-token mode + service worker. Server-side: Node + Fastify + better-sqlite3, single-binary-style deploy.

### Starter Options Considered (and rejected)

The bundle ceiling (50KB initial / 150KB total gzipped) and the hand-rolled 7-component inventory locked in UX Step 6 disqualify the conventional turnkey starters:

- **Next.js / Remix / Nuxt / SvelteKit** — default JS payloads exceed the bundle budget before any application code is written. SSR/file-system routing is not load-bearing for a single-screen app. Rejected.
- **T3 Stack (Next + tRPC + Prisma + NextAuth)** — bundles auth (out of v1 scope), an ORM (overkill for the narrow data model), and Next.js (rejected above). Rejected.
- **RedwoodJS / Blitz** — full-stack monolith starters that ship more than the project will ever need; "no auth in v1" makes their scaffolding actively misleading. Rejected.
- **shadcn/ui or any UI library** — the UX spec explicitly mandates a hand-rolled 7-component inventory; importing a component library negates the central design discipline. Rejected.
- **SolidStart (the SolidJS meta-framework)** — adds file-system routing and SSR machinery the single-screen app does not need; would bloat the initial bundle. Rejected in favor of plain SolidJS + Vite.

### Selected Starter: `create-solid` (plain Solid + Vite + TypeScript)

**Rationale for Selection:**
- **`create-solid` (the official Solid scaffolder) offers a "Solid + Vite + TypeScript" template** that produces a minimal SPA scaffold — Vite dev server, TypeScript config, JSX/TSX support, no router, no SSR. This is the smallest viable starting point for an SPA on Solid.
- Solid's runtime (~7KB) plus Vite's tree-shaking plus a hand-rolled component layer is the only realistic path to the 50KB initial / 150KB total bundle budget given the Fraunces variable woff2 also competes for budget.
- Plain Solid (not SolidStart) keeps the surface tiny — file-system routing, server actions, and SSR are out of scope for v1.
- Vite is the de facto standard for non-Next SPAs, has first-class Tailwind v4 support, mature plugin ecosystem (`vite-plugin-solid`, `vite-plugin-pwa`), and excellent HMR.

**Initialization Command:**

```bash
# At the monorepo root, after pnpm workspace setup:
cd apps && pnpm create solid web
# When prompted by the CLI, choose:
#   Template: ts (Solid + Vite + TypeScript, NOT SolidStart)
#   No additional integrations from the scaffolder
```

(`create-solid` is the canonical scaffolder per the official Solid quick-start. Verify exact prompt wording at run time — the CLI evolves.)

**Backend** is hand-scaffolded inside `apps/api/` — Fastify + better-sqlite3 needs no starter; the file inventory is small enough (server bootstrap, route handlers for `GET/POST/PATCH/DELETE /tasks`, SQLite schema, idempotency-key middleware) that a starter would mostly be deletion work.

### Architectural Decisions Provided by Starter (`create-solid` "ts" template)

**Language & Runtime:**
- TypeScript (strict mode by default)
- Node ≥ 20 LTS for the toolchain (Vite, vitest, etc.)

**Styling Solution:**
- The `ts` template ships no styling solution; Tailwind v4 is added immediately as the next install step (`pnpm add -D tailwindcss@latest @tailwindcss/vite`). Tailwind v4's Vite plugin replaces the v3 PostCSS-based setup; `@theme` blocks live in a single `globals.css`. **Strict-token mode** (locked in UX Step 6) is enforced via a custom `@theme` that disables default palettes; lint rule against unprefixed default-palette utilities is added in Phase 1 of the implementation roadmap.

**Build Tooling:**
- Vite (via `vite-plugin-solid`)
- Production build outputs ES modules, code-split, with Vite's default tree-shaking and minification (esbuild + Rollup)
- Manifest generation for service-worker pre-caching is added via `vite-plugin-pwa` in a later step (registered explicitly in step 4 — Persistence & Sync architecture)
- Bundle-size budget is enforced in CI via a custom check on `dist/` output (added during step 5 — Patterns)

**Testing Framework:**
- The starter does not preinstall a test framework. Choices made in step 4 (Architectural Decisions): **Vitest** for unit + property-based tests (with `fast-check`), **Playwright** for E2E + a11y (axe-core) + visual regression + latency benchmarks.

**Code Organization (monorepo, `pnpm` workspaces):**

```
bmad-todo/
├── apps/
│   ├── web/            # SolidJS SPA (created by create-solid)
│   │   ├── src/
│   │   │   ├── components/    # 7 components from UX spec
│   │   │   ├── store/         # state + undo stack
│   │   │   ├── sync/          # service worker + outbox
│   │   │   ├── styles/        # Tailwind @theme blocks
│   │   │   └── main.tsx
│   │   ├── public/
│   │   └── vite.config.ts
│   └── api/            # Fastify + better-sqlite3 (hand-scaffolded)
│       └── src/
│           ├── routes/
│           ├── db/
│           └── server.ts
├── packages/
│   └── shared/         # TypeScript types: Task, Mutation, IdempotencyKey
├── tests/
│   ├── perf/           # latency budget tests
│   ├── property/       # fast-check destructive-op tests
│   └── e2e/            # Playwright + axe + visual regression
├── pnpm-workspace.yaml
└── package.json
```

**Development Experience:**
- HMR via Vite, sub-second reload
- `pnpm --filter web dev` and `pnpm --filter api dev` run independently (or use `pnpm -r --parallel dev` for both)
- TypeScript project references via `packages/shared` give end-to-end type safety on the wire format without runtime overhead

**Note:** Project initialization using this command should be the first implementation story (Phase 1 / Foundation in the UX implementation roadmap). The repository scaffolding precedes any application code.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical (block implementation):**
- Frontend framework + bundler (Solid + Vite + TS) — locked in step 3
- Backend runtime + framework + DB driver (Node 20+ / Fastify / better-sqlite3) — locked in step 3
- Database access layer (Kysely + raw SQL migrations)
- Wire-format validation (Zod in packages/shared)
- IndexedDB layer (idb)
- Service-worker strategy (vite-plugin-pwa + custom Workbox)

**Important (shape architecture):**
- Hosting target (Fly.io)
- Access restriction (Cloudflare Access in front of the Fly app)
- CI provider (GitHub Actions)
- Logging on backend (pino — Fastify default, ships zero overhead)
- API design pattern (`Idempotency-Key` request header, soft-delete server side)
- v1 single-region deploy; no horizontal scaling targets

**Deferred (Growth scope or post-MVP):**
- OAuth/OIDC authentication mechanism (data model leaves clean seam; unblocked at any time)
- Multi-device sync conflict resolution (CRDT or operational-transform — out of v1)
- Postgres migration path (clean Kysely dialect swap when needed)
- Native desktop / mobile apps (Vision)
- Public API / extensibility (Vision)
- Search and `/`-filter UI (Growth)
- Self-hosted CI runner for latency-budget jobs (only if shared runner variance becomes a CI flake source)

### Data Architecture

**Database:** SQLite via `better-sqlite3` (synchronous Node binding, ~10× faster than async wrappers for this workload). WAL mode enabled at startup for concurrent reads while a write is in flight.

**Schema (single table for v1):**

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,                  -- UUIDv7 (lexicographically time-ordered, generated client-side)
  user_namespace TEXT NOT NULL,         -- 'default' in v1; per-user in Growth
  text TEXT NOT NULL CHECK (length(text) <= 10000),
  completed_at INTEGER,                 -- NULL when active; epoch ms when completed
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER                    -- soft-delete; ≥30 day server retention (NFR-Rel-4)
);
CREATE INDEX idx_tasks_namespace_created ON tasks (user_namespace, created_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY,                 -- client-supplied; bound to user_namespace
  user_namespace TEXT NOT NULL,
  request_hash TEXT NOT NULL,           -- SHA-256 of request body
  response_status INTEGER NOT NULL,
  response_body TEXT NOT NULL,          -- JSON
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_idem_created ON idempotency_keys (created_at);  -- for periodic purge
```

**Access layer:** **Kysely** typed SQL builder. Migrations are plain `.sql` files in `apps/api/migrations/NNNN_description.sql`, applied in lexicographic order at boot via a tiny custom runner (`migrations` table tracks applied filenames). Rationale: project has 1 application table; an ORM is net overhead, but lossless type inference matters.

**Validation:** Zod schemas in `packages/shared/src/schema.ts` define `Task`, `CreateTaskInput`, `UpdateTaskInput`, `Mutation`, and the `Idempotency-Key` format. Server validates with `parse()` at the route boundary. Client gets `z.infer<>` types for free. Fastify integration via `fastify-type-provider-zod` for typed routes.

**Caching strategy (client):** IndexedDB via `idb` wrapper. Two object stores:
- `tasks` — keyed by id; the cached representation of server state (last-known good plus pending local mutations applied).
- `outbox` — keyed by client-generated mutation id (UUIDv7). Each entry: `{ id, type: 'create'|'update'|'delete', payload, idempotencyKey, queuedAt }`. FIFO replay on reconnect.

### Authentication & Security

**v1 authentication:** None at the application layer (per PRD).

**v1 access restriction:** **Cloudflare Access** in front of the Fly app. Single allowed identity (Matt's Google or GitHub identity). HTTPS terminated at Cloudflare; HSTS via Fly's certs on origin. The app trusts the `Cf-Access-Jwt-Assertion` header as the access proof — verified against the Cloudflare team's JWKS at server boot.

**Clean seam for Growth-scope auth:** the `user_namespace` column is populated from the verified Cloudflare Access JWT's `sub` claim today. When v1 graduates to multi-user, the JWT-to-namespace mapping is the only swap required — no schema migration, no rewrite of route handlers.

**Security posture:**
- All transport HTTPS via Cloudflare → Fly. HTTP redirected. HSTS with `includeSubDomains` and `preload`.
- All user-supplied text rendered as plain text only (FR4, NFR-Sec-1). No HTML, markdown, or script evaluated. Solid's JSX uses `textContent` by default; explicit `innerHTML` is forbidden by lint.
- Server enforces task text ≤ 10,000 chars (NFR-Sec-2) — both Zod schema and SQL CHECK constraint.
- Rate limiting: `@fastify/rate-limit` plugin, 100 req/min per `user_namespace`. Errors surface to the client as 429; client outbox treats 429 as a retry signal with backoff.
- Dependency audit (`pnpm audit --audit-level=high`) runs in CI; high-severity advisories fail the build (NFR-Sec-4).
- Secrets injected via Fly secrets at deploy time only. No client bundle ever sees backend env vars.

### API & Communication Patterns

**REST endpoints (single resource, narrow surface):**

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/tasks` | Returns all non-deleted tasks for the namespace, newest-first |
| `POST` | `/tasks` | Create. Body: `{ id, text, createdAt }`. Idempotency-Key header required. |
| `PATCH` | `/tasks/:id` | Update text and/or completed_at. Idempotency-Key header required. |
| `DELETE` | `/tasks/:id` | Soft-delete (sets `deleted_at`). Idempotency-Key header required. |
| `GET` | `/health` | Liveness probe for Fly. Returns 200 unconditionally. |

**Idempotency contract:**
- Every mutating request requires an `Idempotency-Key` header (UUIDv7, client-generated).
- Server stores `(key, request_hash, response)` for 24 h. Replay of a request with the same key returns the stored response without re-executing the mutation. Replay with a different request body but the same key returns 409.
- This makes the outbox safe to replay on reconnect (NFR-Rel-5: ≥10 retries without producing duplicate state).

**Error format (consistent envelope):**

```json
{ "error": { "code": "ValidationError", "message": "..." } }
```

Error codes are an enum: `ValidationError | NotFound | Conflict | RateLimited | ServerError`. Client routes any 5xx and any sustained network failure into the annunciator (Offline / Storage error / Sync conflict).

**No GraphQL, no tRPC.** REST + JSON Schema (via Zod) is the smallest contract that does the job. tRPC was considered and rejected: the wire format is trivial enough that the overhead of tRPC's runtime + generated client isn't justified for 4 endpoints.

**No WebSockets in v1.** All sync is HTTP request/response. Polling is not used either; server-of-truth state is reconciled at user-driven moments (page open, after writes complete, on annunciator click). Real-time multi-device sync is Growth scope and would adopt SSE or WebSocket then.

### Frontend Architecture

**Reactivity primitives (idiomatic Solid):**
- `createSignal` for individual reactive values (e.g., theme, focused-row index).
- `createStore` for the task list and undo stack — fine-grained reactivity at the task level so adding/completing/editing one task does not re-render the whole list.
- `createResource` for the initial cache-then-server fetch pattern.
- No external state library (Zustand, Jotai, Redux). Solid's primitives are the state library.

**Component model:** the 7 components from UX Step 11 (`<App>`, `<TaskList>`, `<TaskRow>`, `<CaptureLine>`, `<Annunciator>`, `<Tick>`, `<FocusRing>`) — each as a `.tsx` file in `apps/web/src/components/`. No further component decomposition without explicit UX-spec change.

**Render strategy for `<CaptureLine>`:** uncontrolled input. The DOM owns the typed text; Solid does not re-render on every keystroke. Commit on `enter` reads `el.value`, dispatches mutation, clears input. This is the load-bearing tactic for NFR-Perf-1 (<16ms p95 keystroke→render).

**Render strategy for `<TaskList>`:** no virtualization in v1. Solid's fine-grained reactivity with a typical user-task count well under 100 stays comfortably under the perceived-latency budgets. Re-evaluate if benchmarks at 1000 rows breach NFR-Perf-7 (<50MB memory).

**Routing:** none. The app is single-screen. No `solid-router`, no path-based state.

**Bundle optimization:**
- Vite's default tree-shaking + esbuild minification.
- Manual chunk for the service worker (separate from app shell).
- Fraunces variable woff2 self-hosted, subsetted to Latin + Latin-Ext, `font-display: block` ≤200ms then `swap` (matches UX Step 8 spec).
- CI fails the build if `dist/` initial-JS exceeds 50KB gzipped or total exceeds 150KB gzipped (NFR-Perf-6).

**Service worker:**
- Generated by `vite-plugin-pwa` with `injectManifest` strategy (custom SW source, plugin handles precache list + registration boilerplate).
- Workbox modules used selectively: `precaching`, `routing`, `strategies` (`CacheFirst` for assets, `NetworkFirst` for `/tasks`), `background-sync` for outbox replay.
- Custom logic: outbox dispatch with idempotency keys, queue-order preservation, annunciator state messages to the page via `postMessage`.

**PWA install:** manifest with name, icons, theme-color matching active theme, `display: standalone`. Inline `<head>` script reads theme before paint; theme color in manifest matches default light theme (no flicker on splash).

### Infrastructure & Deployment

**Hosting:** **Fly.io** single-region (closest to Matt). One small `shared-cpu-1x` VM (256MB RAM is plenty for SQLite + Fastify at this scale). Persistent volume mounted at `/data` for the SQLite file; nightly volume snapshot retained 14 days.

**Topology:**
- Cloudflare → Cloudflare Access gate → Fly app
- Fly app process: a single Node process running both Fastify (API) and serving the built SPA static assets from `apps/web/dist/`. Same origin avoids CORS entirely.
- SQLite on the persistent volume; WAL mode; backed up via Fly volume snapshot + a daily logical dump (`sqlite3 .backup`) shipped to Cloudflare R2.

**Environments:**
- `development` — local Vite dev server (`apps/web`) + local Fastify (`apps/api`), shared SQLite at `./data/dev.db`. CORS allowed from `localhost`.
- `production` — single Fly app. No staging in v1 (single user, single deploy; the CI gate is the staging environment).

**CI/CD (GitHub Actions):**

| Job | Runs on | Fails build if |
|---|---|---|
| `lint` | every PR | ESLint or Prettier violation; anti-feature codebase grep matches |
| `typecheck` | every PR | `tsc --noEmit` errors anywhere in the workspace |
| `unit-and-property` | every PR | `vitest` failure; fast-check counterexample on any destructive op |
| `e2e-and-a11y` | every PR | Playwright failure; axe-core violation; visual-regression diff |
| `latency-budget` | every PR | p95 keystroke→render >16ms, check→strike >50ms, add→appear >100ms |
| `bundle-budget` | every PR | initial JS >50KB or total >150KB gzipped |
| `audit` | every PR + nightly | `pnpm audit --audit-level=high` |
| `stress-sync` | nightly + on-tag | 1000-op outbox replay produces duplicates or losses |
| `deploy` | push to `main` | any of the above failed |

Deploy is a single `flyctl deploy` step; Fly handles the rolling restart. Migrations apply at boot.

**Logging & observability:**
- Backend: `pino` (Fastify's default logger). Structured JSON to stdout. Fly's log shipping retains 7 days; tail via `flyctl logs`.
- Task text is **never logged in plaintext** (NFR-Priv-1). Mutation log entries include task id, type, namespace, and outcome — not text content.
- No production telemetry on user behavior (NFR-Obs-3). No analytics SDK in the client. The annunciator and the dev-mode latency display are the user-facing observability.
- CI latency-budget job is the production-facing perf signal — there is no production performance monitoring service in v1.

**Backups & recovery:**
- Volume snapshots daily, retained 14 days.
- `sqlite3 .backup` daily, shipped to R2, retained 30 days.
- DR plan: launch a new Fly volume from snapshot or restore from R2 dump. RTO target: under 1 hour; RPO: 24 hours. Personal-use posture; not a service-level commitment.

### Decision Impact Analysis

**Implementation Sequence:** This drives the implementation roadmap order:

1. Repo scaffold (`pnpm` workspace + `create-solid` for `apps/web` + manual `apps/api` + `packages/shared`).
2. Tokens + theme attribute setter (`apps/web/src/styles/`) — UX Phase 1.
3. Capture loop (`<App>` + `<CaptureLine>` + `<TaskList>` + `<TaskRow>`-at-rest) with **in-memory store only**.
4. Backend skeleton: Fastify + Kysely + migrations + 4 routes + Zod validation + idempotency-key middleware. Wire the client store to the network behind a flag.
5. Persistence: IndexedDB via `idb`; replace in-memory store with cache-then-server.
6. Service worker via `vite-plugin-pwa`; introduce outbox + Workbox Background Sync.
7. Annunciator wiring (sync-state → indicator) and undo stack.
8. CI gates: lint / typecheck / vitest / Playwright / axe / visual-regression / latency / bundle / stress.
9. Cloudflare Access + Fly deploy.
10. Manual screen-reader pass; polish.

**Cross-component dependencies:**
- `Idempotency-Key` is the load-bearing primitive for both server (dedupe table) and client (outbox replay). It MUST be specified in `packages/shared` before either side is implemented; both sides must agree on UUIDv7 generation.
- `user_namespace` plumbing must exist end-to-end from day one (`'default'` value), even though only one user exists in v1 — adding it later is a schema migration, not a refactor.
- Soft-delete (`deleted_at`) is what enables session-long undo across the network boundary; the API contract for `DELETE` and the client outbox both depend on this being settled in step 4 before either side codes.
- The annunciator is the only failure surface; every component / SW / network code path that can fail must route through the same store key. The annunciator state shape is part of the contract between the SW and the page — defined in `packages/shared`.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

These rules exist so any agent (human or AI) writing code in this repo makes the same micro-choices. Rules are deliberately tight — variation here costs more than it gains.

### Naming Patterns

**Database (snake_case, plural tables):**
- Tables: `tasks`, `idempotency_keys`, `migrations` — plural, snake_case.
- Columns: `user_namespace`, `created_at`, `deleted_at` — snake_case.
- Indexes: `idx_<table>_<columns>` — e.g., `idx_tasks_namespace_created`.
- Timestamps: integer epoch ms (`INTEGER` in SQLite). Never `TEXT` ISO strings, never `DATETIME`.

**TypeScript (camelCase, single source of truth via Kysely + Zod):**
- Variables, functions, fields: `camelCase` (`userNamespace`, `createdAt`).
- Types and interfaces: `PascalCase` (`Task`, `CreateTaskInput`, `Mutation`).
- Constants: `SCREAMING_SNAKE_CASE` only for true compile-time constants (`MAX_TASK_LENGTH`, `IDEMPOTENCY_TTL_MS`); regular config values stay `camelCase`.
- Boolean variables: prefixed `is`/`has`/`can`/`should` (`isOffline`, `hasConflict`, `canUndo`).
- DB ↔ TS mapping: Kysely's `Selectable<T>` + a thin `toTask(row)` mapper in `apps/api/src/db/mappers.ts` converts `snake_case` rows to `camelCase` objects. Never expose raw DB rows past the repo layer.

**API (camelCase JSON, kebab-case URLs, plural resources):**
- URLs: `/tasks`, `/tasks/:id`, `/health` — plural, kebab-case if multi-word.
- Path params: `:id` (Fastify style), never `{id}`.
- Headers: `Idempotency-Key`, `Cf-Access-Jwt-Assertion` — `Train-Case` per HTTP convention.
- JSON field names: `camelCase` end-to-end (`userNamespace`, `completedAt`). Server transforms snake_case rows to camelCase JSON in the route handler, not in the client.
- Status codes: `200` for read success, `201` for create, `204` for delete success, `400` for validation, `404` for not-found, `409` for conflict (incl. idempotency-key-with-different-body), `429` for rate-limited, `5xx` for server failures.

**Files & directories (kebab-case for files, PascalCase for component files):**
- Components: `apps/web/src/components/CaptureLine.tsx` — `PascalCase.tsx` matching the component name.
- Hooks / non-component modules: `apps/web/src/store/use-task-store.ts` — `kebab-case.ts`.
- Backend modules: `apps/api/src/routes/tasks.ts`, `apps/api/src/db/mappers.ts` — `kebab-case.ts`.
- Migrations: `apps/api/migrations/0001_init.sql` — `NNNN_description.sql` (4-digit zero-padded, applied lexicographically).
- Test files: co-located, same name + `.test.ts(x)` (e.g., `CaptureLine.test.tsx`, `tasks.test.ts`). E2E + visual-regression tests live in `tests/e2e/` only.

### Structure Patterns

**Test colocation rules:**
- Unit + property-based tests: co-located with source (`Foo.test.ts` next to `Foo.ts`). Ran by `vitest`.
- Integration tests (route + DB): `apps/api/src/routes/*.integration.test.ts`. Spin up an in-memory SQLite per test.
- E2E + a11y + visual-regression: `tests/e2e/<journey>.spec.ts`. Playwright owns this directory.
- Latency-budget tests: `tests/perf/<budget>.bench.ts`. Run by Playwright with custom timing harness.
- Sync stress tests: `tests/property/sync-invariants.test.ts`. fast-check + simulated network state machine.

**Module boundaries (frontend):**
- `components/` — presentation only. No fetch, no IDB, no business logic. Receives signals/stores via props or `useContext`.
- `store/` — reactive state owners. The task store, the undo stack, the theme, the annunciator state. No DOM access.
- `sync/` — IndexedDB wrappers, fetch wrappers, outbox dispatch, service-worker message handlers. No reactivity primitives directly; emits state changes that `store/` reacts to.
- `styles/` — Tailwind `@theme` blocks, global resets, the focus-ring rules. No JS.
- Imports: components may import from `store/`; `store/` may import from `sync/`; `sync/` may not import from `components/` or `store/`. ESLint `import/no-restricted-paths` enforces.

**Module boundaries (backend):**
- `routes/` — request validation (Zod), call repo, format response. No SQL, no business logic.
- `db/` — Kysely queries and row → object mappers. No HTTP concerns.
- `db/repos/` — one file per resource (`tasks-repo.ts`). Pure data access; transactions live here.
- `middleware/` — Fastify hooks (idempotency, auth-jwt-verify, rate-limit configuration).
- `server.ts` — wires it all together. Starts the server. The only file that calls `app.listen`.

### Format Patterns

**API success responses — naked resource, no envelope:**

```json
// GET /tasks
[ { "id": "...", "text": "...", "completedAt": null, "createdAt": 1735200000000 } ]

// POST /tasks → 201
{ "id": "...", "text": "...", "completedAt": null, "createdAt": 1735200000000 }

// DELETE /tasks/:id → 204 (empty body)
```

**API error responses — uniform envelope, only on error:**

```json
{ "error": { "code": "ValidationError", "message": "text exceeds 10000 chars" } }
```

`code` is one of: `ValidationError | NotFound | Conflict | RateLimited | ServerError`. `message` is human-readable; the client never displays it (annunciator-only) but it's present for log correlation.

**Date/time format:**
- On the wire and in storage: integer epoch ms (`createdAt: 1735200000000`).
- In the DOM / for display: convert at the render boundary using `Intl.DateTimeFormat` with the user's locale. Display only happens in the dev-mode latency display in v1; no task timestamps are shown to the user.
- Generation: `Date.now()` in TS, `unixepoch('subsec') * 1000` in SQL (SQLite ≥3.42).

**ID format:**
- All IDs are UUIDv7, generated client-side via the `uuidv7` package. Lexicographically time-ordered, so DB inserts and `ORDER BY id DESC` give the same ordering as `ORDER BY created_at DESC` for free.
- Never use SQLite `INTEGER PRIMARY KEY` autoincrement. Client must be able to assign IDs without a server round-trip (optimistic writes depend on this).
- Never expose internal numeric row IDs anywhere — there are none.

**Idempotency-Key format:**
- UUIDv7, fresh per mutation (not reused across retries of different mutations).
- Sent as `Idempotency-Key: <uuid>` header on every mutating request.
- Server stores `(key, request_hash, response_status, response_body)` for 24 h; replay returns stored response.

### Communication Patterns

**Service worker ↔ page communication (single channel, typed messages):**
- Defined in `packages/shared/src/sw-messages.ts` as a discriminated union.
- Page → SW: `{ type: 'flush-outbox' }`, `{ type: 'reconcile' }`.
- SW → page: `{ type: 'sync-state', state: 'online' | 'offline' | 'conflict' | 'error' }`, `{ type: 'mutation-applied', id }`, `{ type: 'mutation-rejected', id, reason }`.
- All messages flow via `postMessage` / `client.postMessage`. No `BroadcastChannel`.
- The page state's `annunciator` signal is updated solely by `sync-state` messages — **no other code path writes to it**.

**State management patterns (Solid):**
- Reactive primitives only inside `store/`. Components receive signals or store accessors via props.
- Store updates are immutable: `setStore('tasks', tasks => [...tasks, newTask])`. No direct push/splice on store-owned arrays.
- The undo stack is a separate store (`createStore<UndoEntry[]>([])`). Each entry: `{ inverseMutation, timestamp }`. `u` pops; the popped inverse mutation is dispatched through the same path as user mutations (so it goes through the outbox, gets an idempotency key, and reconciles like any other write).
- No global event bus. Cross-store communication happens by reading the other store's signals reactively.

**Action / mutation naming:**
- Mutations are typed values, not functions: `Mutation = { type: 'create' | 'update' | 'delete', ... }`. Defined in `packages/shared/src/schema.ts`.
- Functions that produce mutations: `verbNoun` form (`createTask`, `completeTask`, `deleteTask`).
- Functions that apply mutations: `applyMutation(store, mutation)` — single entry point, used identically for user actions and undo replays.

### Process Patterns

**Error handling — three layers, single failure surface:**

1. **Validation errors** (Zod parse fails): caught at the route boundary in Fastify; returned as `400 ValidationError`. Client never displays the message.
2. **Sync / network errors** (timeouts, 5xx, sustained offline): SW catches, queues to outbox if mutating, posts `sync-state: 'offline'` to the page. Page surfaces the annunciator after the 2s transient threshold (UX spec Step 11).
3. **Persistence errors** (IndexedDB write fails, quota exceeded, browser blocked storage): page catches in the `sync/idb.ts` wrapper, posts `sync-state: 'error'` directly. Annunciator label becomes "Storage error"; clicking surfaces a manual export action.

There is no per-component `try/catch`-with-toast. There is no React-style error boundary in the conventional sense. **All failures route through the annunciator.** This is enforced by codebase grep for `toast(`, `Snackbar`, `<Modal`, etc. (NFR-Maint-3).

**Loading states — there are none:**
- Cache-first paint means there is no "loading" state for the task list after the first-ever visit.
- First-ever visit: the empty composition + cursor renders immediately (no network dependency); tasks fetch in parallel and merge in. No skeleton, no spinner.
- Pattern: any component or store reading `tasks` reads the cache snapshot synchronously. Network state is reflected only in the annunciator, not in component-local loading flags.

**Retry patterns:**
- Mutating requests are retried by the SW outbox using exponential backoff (1s, 2s, 4s, 8s, 16s, capped at 60s). Idempotency key is preserved across retries.
- Non-mutating GETs are not retried automatically — if a reconciliation fetch fails, the cache simply stays current and the next user action triggers a fresh attempt.
- 429 (rate-limited): SW honors `Retry-After` header; otherwise uses backoff.
- 409 (idempotency conflict — same key, different body): outbox treats as a programming error (this should be impossible if the client is correct); logs to console, posts `sync-state: 'error'`, drops the entry.

**Logging conventions (backend, pino):**

```ts
// shape — always JSON, never f-string
log.info({ event: 'task.created', taskId, userNamespace, idempotencyKey, status: 'new' });
log.warn({ event: 'idempotency.replayed', taskId, userNamespace, idempotencyKey });
log.error({ event: 'db.write_failed', err: serializeError(err), userNamespace });
```

- `event` is the canonical name (`<resource>.<verb>` or `<subsystem>.<failure>`).
- **Never log task text.** This is a hard rule (NFR-Priv-1). ESLint rule `no-restricted-syntax` blocks any `log.*` call whose object literal contains a `text` property.
- No `console.log` in committed code. Lint rule `no-console` errors except in the Vite dev server bootstrap (whitelisted file).

**Frontend logging:**
- Production: no logs. The browser console is silent.
- Dev mode (`cmd+shift+L` per FR44): the latency display is the only output. Optional verbose flag enables sync-state transitions to console.

### Enforcement Guidelines

**All AI agents and human contributors MUST:**
1. Read this section before writing any code in this repo.
2. Use the patterns above without variation. If a pattern conflicts with the task, raise it as a question and update the architecture doc — do not silently deviate.
3. Run the full pre-commit hook (lint + typecheck + vitest changed-files) before pushing.
4. Treat any CI failure as a hard stop — never `--no-verify`, never disable a CI job.

**Pattern enforcement (mechanical, in CI):**
- ESLint with `import/no-restricted-paths`, `no-console`, `no-default-export`, `no-restricted-syntax` (forbidden patterns from anti-feature contract).
- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- Codebase grep job (in `lint` CI step) fails on: `toast(`, `Snackbar`, `Toaster`, `Skeleton`, `Spinner`, `confirm(`, `alert(`, `<Modal`, `<Dialog`, `🎉`, `✨`, `🏆`, `Streak`, `Achievement`, `XP`, `Karma`.
- Visual-regression snapshot of the empty state (NFR-Maint-3) catches any drift toward chrome.
- Bundle-size check on `dist/`.

**Pattern updates:**
- Pattern changes happen here, in this section, via PR. The PR description states what changed and why.
- Patterns are not changed during a feature PR — separate the discussion of the rule from the work the rule enables.

### Pattern Examples

**Good — task creation, end to end:**

```ts
// packages/shared/src/schema.ts
export const Task = z.object({
  id: z.string().uuid(),
  userNamespace: z.string(),
  text: z.string().min(1).max(10000),
  completedAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});
export type Task = z.infer<typeof Task>;

// apps/api/src/routes/tasks.ts
app.post('/tasks', { schema: { body: CreateTaskInput } }, async (req, reply) => {
  const idempotencyKey = req.headers['idempotency-key'] as string;
  const cached = await idempotencyRepo.find(idempotencyKey, req.userNamespace);
  if (cached) return reply.status(cached.responseStatus).send(JSON.parse(cached.responseBody));
  const task = await tasksRepo.create({ ...req.body, userNamespace: req.userNamespace });
  await idempotencyRepo.store(idempotencyKey, req.userNamespace, hash(req.body), 201, JSON.stringify(task));
  log.info({ event: 'task.created', taskId: task.id, userNamespace: req.userNamespace, idempotencyKey });
  return reply.status(201).send(task);
});

// apps/web/src/store/task-store.ts
export function createTask(text: string) {
  const task: Task = {
    id: uuidv7(),
    userNamespace: 'default',
    text,
    completedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  setStore('tasks', tasks => [task, ...tasks]);                // optimistic, immediate
  pushUndo({ inverseMutation: { type: 'delete', id: task.id } });
  enqueueOutbox({ type: 'create', payload: task, idempotencyKey: uuidv7() });
}
```

**Anti-patterns (do not do any of these):**

```ts
// ❌ toast on success
showToast('Task added!');                  // FORBIDDEN by anti-feature contract

// ❌ component-local loading state
const [loading, setLoading] = createSignal(false);   // there is no loading state in this app

// ❌ logging task text
log.info({ event: 'task.created', text });           // PII / privacy violation

// ❌ snake_case in TS
const { user_namespace } = req.body;                 // use camelCase; mappers convert at the boundary

// ❌ direct mutation of store-owned arrays
store.tasks.push(newTask);                           // breaks Solid reactivity; use setStore

// ❌ default export of a component
export default function CaptureLine() { ... }        // use named exports only

// ❌ try/catch that swallows into a banner
try { await fetch(...) } catch { setError('Something went wrong'); }   // route via annunciator only
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
bmad-todo/
├── .github/
│   └── workflows/
│       ├── ci.yml                          # lint, typecheck, vitest, e2e+a11y, latency, bundle, audit, stress
│       └── deploy.yml                      # flyctl deploy on push to main (depends on ci.yml success)
├── .vscode/
│   └── settings.json                       # editor defaults; ESLint + Prettier on save
├── apps/
│   ├── web/                                # SolidJS SPA — created by `pnpm create solid web` (ts template)
│   │   ├── public/
│   │   │   ├── icons/                      # PWA icons (192, 512, maskable)
│   │   │   ├── fonts/
│   │   │   │   └── Fraunces-VF.woff2       # subsetted Latin + Latin-Ext
│   │   │   └── manifest.webmanifest        # PWA manifest (generated by vite-plugin-pwa)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── App.tsx                 # root; theme attribute owner; global keyboard
│   │   │   │   ├── App.test.tsx
│   │   │   │   ├── TaskList.tsx            # <ul> + roving tabindex
│   │   │   │   ├── TaskList.test.tsx
│   │   │   │   ├── TaskRow.tsx             # at-rest / focused / completed / edit states
│   │   │   │   ├── TaskRow.test.tsx
│   │   │   │   ├── CaptureLine.tsx         # uncontrolled input; sticky focus
│   │   │   │   ├── CaptureLine.test.tsx
│   │   │   │   ├── Annunciator.tsx         # role="status" aria-live="polite"
│   │   │   │   ├── Annunciator.test.tsx
│   │   │   │   ├── Tick.tsx                # SVG with per-instance Bezier variance
│   │   │   │   ├── Tick.test.tsx
│   │   │   │   └── DevLatencyDisplay.tsx   # hidden (cmd+shift+L), aria-hidden
│   │   │   ├── store/
│   │   │   │   ├── task-store.ts           # createStore<Task[]> + applyMutation
│   │   │   │   ├── task-store.test.ts      # property-based tests on destructive ops
│   │   │   │   ├── undo-stack.ts           # createStore<UndoEntry[]>
│   │   │   │   ├── undo-stack.test.ts
│   │   │   │   ├── annunciator-store.ts    # SyncState signal
│   │   │   │   ├── theme-store.ts          # theme attribute + localStorage
│   │   │   │   └── focus-store.ts          # roving-tabindex focused-row index
│   │   │   ├── sync/
│   │   │   │   ├── idb.ts                  # idb wrappers around `tasks` + `outbox` stores
│   │   │   │   ├── idb.test.ts
│   │   │   │   ├── outbox.ts               # enqueue / drain / replay
│   │   │   │   ├── outbox.test.ts          # property-based tests on FIFO + idempotency
│   │   │   │   ├── api-client.ts           # fetch wrapper with Idempotency-Key
│   │   │   │   ├── sw-bridge.ts            # postMessage glue between page and SW
│   │   │   │   └── sw.ts                   # service worker source (vite-plugin-pwa injectManifest)
│   │   │   ├── styles/
│   │   │   │   ├── globals.css             # @theme blocks (light + dark), tokens, focus ring
│   │   │   │   └── tailwind.css            # @import "tailwindcss"; lint-enforced strict-token usage
│   │   │   ├── lib/
│   │   │   │   ├── ids.ts                  # uuidv7 wrapper
│   │   │   │   ├── latency.ts              # performance.now() instrumentation primitives
│   │   │   │   └── tick-path.ts            # generateTickPath(seed) for variance
│   │   │   ├── main.tsx                    # entry; mounts <App>; registers SW
│   │   │   ├── theme-bootstrap.ts          # inline-head script: read prefers-color-scheme + localStorage, set data-theme before paint
│   │   │   └── env.d.ts                    # Vite ImportMeta types
│   │   ├── index.html                      # <head> includes theme-bootstrap inline
│   │   ├── vite.config.ts                  # vite-plugin-solid + vite-plugin-pwa(injectManifest) + tailwindcss
│   │   ├── tsconfig.json                   # extends ../../tsconfig.base.json; references ../../packages/shared
│   │   ├── package.json
│   │   └── README.md
│   └── api/                                # Fastify + Kysely + better-sqlite3 — hand-scaffolded
│       ├── src/
│       │   ├── server.ts                   # entry; wires plugins; app.listen
│       │   ├── routes/
│       │   │   ├── tasks.ts                # GET/POST/PATCH/DELETE /tasks
│       │   │   ├── tasks.integration.test.ts
│       │   │   └── health.ts               # GET /health
│       │   ├── db/
│       │   │   ├── kysely.ts               # Kysely instance + schema types
│       │   │   ├── mappers.ts              # snake_case row → camelCase Task
│       │   │   ├── migrate.ts              # migration runner (reads /migrations, applies in order)
│       │   │   └── repos/
│       │   │       ├── tasks-repo.ts
│       │   │       ├── tasks-repo.test.ts
│       │   │       ├── idempotency-repo.ts
│       │   │       └── idempotency-repo.test.ts
│       │   ├── middleware/
│       │   │   ├── idempotency.ts          # Fastify hook: dedupe by Idempotency-Key
│       │   │   ├── idempotency.test.ts
│       │   │   ├── auth-jwt.ts             # verify Cf-Access-Jwt-Assertion against Cloudflare JWKS
│       │   │   ├── auth-jwt.test.ts
│       │   │   ├── rate-limit.ts           # @fastify/rate-limit config
│       │   │   └── error-envelope.ts       # uniform { error: { code, message } } formatter
│       │   ├── lib/
│       │   │   ├── log.ts                  # pino instance; redaction rules (no `text`)
│       │   │   └── hash.ts                 # SHA-256 for request_hash
│       │   └── env.ts                      # Zod-validated env vars
│       ├── migrations/
│       │   ├── 0001_init.sql               # tasks, idempotency_keys, migrations
│       │   └── 0002_indexes.sql
│       ├── tsconfig.json
│       ├── package.json
│       └── README.md
├── packages/
│   └── shared/                             # zero-runtime types + Zod schemas
│       ├── src/
│       │   ├── schema.ts                   # Task, CreateTaskInput, UpdateTaskInput, Mutation, ErrorEnvelope, ErrorCode
│       │   ├── schema.test.ts
│       │   ├── sw-messages.ts              # discriminated union: Page↔SW message types
│       │   └── index.ts                    # re-exports
│       ├── tsconfig.json
│       └── package.json
├── tests/
│   ├── e2e/                                # Playwright
│   │   ├── j1-capture-work-review.spec.ts
│   │   ├── j2-delete-undo.spec.ts
│   │   ├── j3-return-after-absence.spec.ts
│   │   ├── j4-first-ever-visit.spec.ts
│   │   ├── j5-inline-edit.spec.ts
│   │   ├── j6-offline-reconcile.spec.ts
│   │   ├── a11y.spec.ts                    # axe-core on every documented state
│   │   ├── visual-regression.spec.ts       # snapshots: empty / populated / focused / annunciator (both themes, mobile + desktop)
│   │   ├── keyboard-only.spec.ts           # NFR-A11y-3: full coverage with no pointer
│   │   └── playwright.config.ts
│   ├── perf/                               # latency budget benchmarks
│   │   ├── keystroke-to-render.bench.ts    # NFR-Perf-1 <16ms p95
│   │   ├── check-to-strike.bench.ts        # NFR-Perf-2 <50ms p95
│   │   ├── add-to-appear.bench.ts          # NFR-Perf-3 <100ms p95
│   │   └── cold-load-paint.bench.ts        # NFR-Perf-4 <100ms after JS eval
│   └── property/                           # cross-cutting property tests
│       ├── sync-invariants.test.ts         # 1000-op stress; never duplicate, never lose
│       ├── outbox-replay.test.ts
│       └── undo-restores-exact-state.test.ts
├── scripts/
│   ├── check-anti-features.sh              # codebase grep for forbidden patterns; runs in lint job
│   ├── check-bundle-size.ts                # parses dist/ and asserts ≤50KB initial / ≤150KB total
│   └── backup-db.sh                        # invoked by Fly cron: sqlite3 .backup → R2
├── infra/
│   ├── fly.toml                            # Fly app config (single region, persistent volume)
│   ├── Dockerfile                          # multi-stage: build pnpm workspace, copy dist + api
│   └── cloudflare-access.tf                # IaC for Cloudflare Access app + policy (optional)
├── data/                                   # gitignored; local SQLite for dev
│   └── .gitkeep
├── docs/
│   ├── PROJECT.md                          # one-paragraph elevator
│   ├── ANTI-FEATURES.md                    # FR45: enumerated anti-feature contract
│   ├── CONTRIBUTING.md                     # references ANTI-FEATURES.md and arch patterns
│   └── adr/                                # architecture decision records (deltas to architecture.md)
│       └── README.md
├── .editorconfig
├── .eslintrc.cjs                           # workspace root config; per-app overrides
├── .gitignore
├── .prettierrc
├── .nvmrc                                  # Node ≥ 20 LTS
├── .npmrc                                  # pnpm config (auto-install-peers, etc.)
├── pnpm-workspace.yaml                     # apps/*, packages/*
├── tsconfig.base.json                      # strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes
├── package.json                            # root scripts: dev, build, test, lint, typecheck, audit
├── README.md                               # thesis + latency budgets + anti-feature contract pointer
└── LICENSE
```

### Architectural Boundaries

**API boundaries (HTTP layer):**
- External (browser → Fly app): 5 routes total (`GET /tasks`, `POST /tasks`, `PATCH /tasks/:id`, `DELETE /tasks/:id`, `GET /health`). All non-health routes require `Cf-Access-Jwt-Assertion`; all mutating routes require `Idempotency-Key`.
- No internal RPC layer; the Fastify process serves both API routes and the SPA static assets from `apps/web/dist/` mounted at `/` (same origin → no CORS).
- No third-party APIs are called from server in v1. (Cloudflare Access JWKS is fetched once at boot; cached.)

**Component boundaries (frontend):**
- The 7 components in `apps/web/src/components/` (plus `DevLatencyDisplay`) are the only renderable units. New components require an explicit UX-spec amendment.
- Components are **presentation-only** — they read signals from props, dispatch actions imported from `store/`. They never `fetch`, never read IndexedDB, never call SW APIs directly.
- Component → Store: components read `store/*` accessors and call `store/*` mutators. One direction.
- Store → Sync: stores call `sync/*` for persistence and outbox enqueue. One direction.
- Sync → Store: sync emits via SW `postMessage` → `sw-bridge.ts` → `annunciator-store` / `task-store`. The bridge is the only place sync writes to stores.

**Service boundaries (backend):**
- `routes/` ↔ `db/repos/`: routes call repo methods. Repos are the only code that uses Kysely. Routes never `db.selectFrom(...)`.
- `middleware/` ↔ `routes/`: middleware adds request decorations (`req.userNamespace`, `req.idempotencyResult`). Routes consume them. No upward dependency.
- `db/migrate.ts` is invoked once at server boot from `server.ts`; never from a route handler.

**Data boundaries:**
- The DB schema in `apps/api/migrations/` is the source of truth for column shape. The Kysely `Database` interface in `db/kysely.ts` is generated/maintained against it.
- `db/mappers.ts` is the only place that converts between the snake_case row shape and the camelCase domain shape. The shape past `mappers.ts` is the same shape on the wire and in `packages/shared`.
- IndexedDB schema lives in `apps/web/src/sync/idb.ts` (`tasks` and `outbox` object stores). Migrations to the IDB schema use the IDB `version` mechanism; migration steps documented in code.

### Requirements to Structure Mapping

**FR1–5 — Task Capture:** `apps/web/src/components/CaptureLine.tsx`, `store/task-store.ts` (`createTask`), `apps/api/src/routes/tasks.ts` (`POST /tasks`), `apps/api/src/db/repos/tasks-repo.ts` (`create`).

**FR6–13 — Task Lifecycle (complete, edit, delete, undo):** `components/TaskRow.tsx`, `store/task-store.ts` (`completeTask`, `editTask`, `deleteTask`, `applyMutation`), `store/undo-stack.ts`, `apps/api/src/routes/tasks.ts` (`PATCH`, `DELETE`).

**FR14–20 — Task Display & Composition:** `components/TaskList.tsx`, `components/TaskRow.tsx`, `components/App.tsx` (asymmetric column layout), `styles/globals.css`.

**FR21–28 — Persistence & Sync:** `apps/web/src/sync/idb.ts`, `sync/outbox.ts`, `sync/sw.ts`, `sync/api-client.ts`, `apps/api/src/db/repos/tasks-repo.ts` (soft-delete), `middleware/idempotency.ts`.

**FR29–31 — Reliability surfaces (annunciator):** `components/Annunciator.tsx`, `store/annunciator-store.ts`, `sync/sw-bridge.ts` (state messages).

**FR32–35 — Input & Navigation:** `components/App.tsx` (global keyboard handler), `components/TaskList.tsx` (roving tabindex), `store/focus-store.ts`.

**FR36–43 — Theming & Accessibility:** `apps/web/src/theme-bootstrap.ts`, `store/theme-store.ts`, `styles/globals.css` (@theme blocks light + dark), `components/App.tsx` (data-theme attribute), `components/Annunciator.tsx` (`role=status` `aria-live=polite`), `components/TaskRow.tsx` (visually-suppressed checkbox).

**FR44–45 — Quality Self-Honesty:** `components/DevLatencyDisplay.tsx` (FR44), `docs/ANTI-FEATURES.md` (FR45), `README.md`.

**FR46–54 — Anti-Feature Contract:** `scripts/check-anti-features.sh` (codebase grep), `tests/e2e/visual-regression.spec.ts` (empty-state snapshot), `.eslintrc.cjs` (no-restricted-syntax rules), `docs/ANTI-FEATURES.md`.

**NFR-Perf-1/2/3/4 — Latency budgets:** `tests/perf/*.bench.ts`, `lib/latency.ts`, `.github/workflows/ci.yml` (`latency-budget` job).

**NFR-Perf-6 — Bundle budget:** `scripts/check-bundle-size.ts`, `.github/workflows/ci.yml` (`bundle-budget` job).

**NFR-Rel-1/2/3 — Sync correctness:** `tests/property/sync-invariants.test.ts`, `tests/property/outbox-replay.test.ts`, `tests/property/undo-restores-exact-state.test.ts`.

**NFR-A11y-1/3/4 — Accessibility:** `tests/e2e/a11y.spec.ts` (axe-core), `tests/e2e/keyboard-only.spec.ts`, manual screen-reader pass tracked in `docs/`.

**NFR-Sec-1/2 — Security:** `apps/api/src/routes/tasks.ts` (Zod validation), `migrations/0001_init.sql` (CHECK constraint on `length(text)`), `middleware/auth-jwt.ts`.

**NFR-Priv-1 — No PII in logs:** `apps/api/src/lib/log.ts` (pino redaction); ESLint rule blocking `log.*({ ..., text })`.

### Integration Points

**Internal communication:**
- Browser ↔ SW: `postMessage` typed via `packages/shared/src/sw-messages.ts`.
- Page ↔ Store: Solid signals/stores read directly; mutations go through `applyMutation`.
- Store ↔ Sync: store calls `enqueueOutbox`; sync notifies store via `sw-bridge`.
- Routes ↔ Repos: direct method calls; repos own all SQL.
- Migrations ↔ DB: one-shot at boot via `migrate.ts`.

**External integrations:**
- **Cloudflare Access** in front of the Fly app — JWT in `Cf-Access-Jwt-Assertion` header verified against the team JWKS endpoint (cached at server boot).
- **Cloudflare R2** for daily SQLite backup — invoked by Fly cron task running `scripts/backup-db.sh`.
- **Fly platform APIs** for deploy, volume snapshots, log shipping — handled via `flyctl`, not from app code.
- No third-party SDKs in the client bundle. No analytics, no feature-flag SDK, no error-reporting SDK.

**Data flow — write path (online):**

```
user keystroke
  → CaptureLine reads el.value on enter
  → store/task-store.createTask(text)
    ├─ setStore('tasks', tasks => [task, ...tasks])      (optimistic)
    ├─ pushUndo({ inverseMutation: { type: 'delete', id } })
    └─ sync/outbox.enqueue({ type: 'create', payload, idempotencyKey })
       → sync/api-client.post('/tasks', { headers: { Idempotency-Key }, body })
         → Fastify middleware/auth-jwt.verify
         → middleware/idempotency.check (cache hit? return)
         → routes/tasks.ts → tasks-repo.create
         → idempotency-repo.store
         → 201 + Task
       ← cache miss / 2xx: outbox marks entry done
```

**Data flow — write path (offline):**

```
user keystroke → ... → outbox.enqueue
  → fetch fails OR navigator.onLine === false
  → entry stays in IndexedDB outbox
  → SW posts sync-state: 'offline' (after 2s threshold)
  → annunciator surfaces

network restored
  → SW Background Sync wakes
  → outbox.drain (FIFO, with backoff on transient failures)
  → SW posts sync-state: 'online' (silent — annunciator hides)
```

**Data flow — read path (cached cold load):**

```
user opens app
  → main.tsx mounts <App>
  → theme-bootstrap.ts has already set data-theme (inline <head>, before paint)
  → App reads tasks from store
  → store/task-store loads from sync/idb.tasks (synchronous read, fast)
  → tasks render
  → in parallel: sync/api-client.get('/tasks') reconciles
  → reconciliation merges server state with pending outbox entries
  → cache updated; UI updates if drift
```

### File Organization Patterns

**Configuration files (root-level, predictable names):**
- `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`, `.eslintrc.cjs`, `.prettierrc`, `.editorconfig`, `.nvmrc`, `.npmrc`, `LICENSE`, `README.md`.
- Per-package configs (`apps/*/package.json`, `apps/*/tsconfig.json`, `apps/web/vite.config.ts`) extend root.
- No nested config files outside packages — no `src/config.ts` patterns; runtime config is in `apps/api/src/env.ts` (Zod-validated process.env).

**Source organization (clear-by-name, never by-feature in v1):**
- Frontend: organized by **layer** (components / store / sync / styles / lib), not by feature. The product has one feature; cross-feature organization would be premature.
- Backend: organized by **HTTP concern** (routes / middleware / db / lib).
- The 7-component cap means no `components/feature-x/` subdirectories. Each component is a top-level file in `components/`.

**Test organization:**
- Unit + small-integration: co-located, `*.test.ts(x)` next to source.
- Cross-cutting: `tests/property/` (property-based), `tests/perf/` (latency), `tests/e2e/` (Playwright).
- No global `__mocks__/` directory — Vitest module mocking is sufficient and inline.

**Asset organization:**
- Static assets in `apps/web/public/`. Fonts subsetted ahead-of-time and committed as `.woff2`. Icons committed as `.png` (precomputed; no runtime SVG-to-icon pipeline).
- No CMS, no asset bundler service. Everything is a checked-in file.

### Development Workflow Integration

**Development server structure:**
- `pnpm -r --parallel dev` launches:
  - `apps/web`: Vite dev server on `:5173` with HMR
  - `apps/api`: Fastify dev (via `tsx watch`) on `:3000`, serving against `./data/dev.db`
- `apps/web` Vite proxy forwards `/tasks` and `/health` to `:3000` so the SPA hits the same paths in dev as in prod.
- Database for dev lives at `./data/dev.db` (gitignored). `pnpm --filter api migrate` runs migrations against it.
- Cloudflare Access is bypassed in dev — `auth-jwt` middleware checks `process.env.NODE_ENV === 'production'` and is skipped locally.

**Build process structure:**
1. `pnpm -r build` →
   - `packages/shared`: `tsc -b` produces `dist/` with `.d.ts` and `.js`.
   - `apps/web`: `vite build` produces static `dist/` (HTML + JS + CSS + service worker + manifest + fonts).
   - `apps/api`: `tsc -b` produces `dist/` with compiled JS.
2. `scripts/check-bundle-size.ts` runs against `apps/web/dist/` and asserts the budget.
3. CI also runs the test pyramid: vitest, then Playwright, then perf benches. Failure at any layer fails the build.

**Deployment structure:**
- Single Docker image built from `infra/Dockerfile` (multi-stage):
  - Stage 1: install pnpm deps, build all workspaces.
  - Stage 2: copy `apps/api/dist`, `apps/web/dist`, `apps/api/migrations`, `node_modules` (production-only via `pnpm deploy`).
- `apps/api/dist/server.js` is the entrypoint. It mounts static-file middleware to serve `apps/web/dist/` at `/`.
- `infra/fly.toml` declares: app name, single region, internal port 3000, persistent volume mount at `/data`, `[checks]` against `/health`.
- Deploy: `flyctl deploy` from CI on push to `main` after all gates pass. Fly does a rolling restart; migrations run at boot via `migrate.ts` before `app.listen`.
