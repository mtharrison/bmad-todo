# Story 1.1: Repository Scaffold and CI Foundation

Status: done

## Story

As a developer,
I want a correctly configured monorepo with type-checking, linting, and CI skeleton in place,
So that every subsequent story is built on a known, reproducible foundation with quality gates from day one.

## Acceptance Criteria

1. **Given** the repository is cloned, **When** `pnpm install && pnpm build` runs, **Then** both `apps/web` (Vite + SolidJS + TypeScript strict) and `apps/api` (Fastify + TypeScript strict) compile without errors.

2. **Given** the app is started, **When** `GET /health` is called on the server, **Then** it returns HTTP 200.

3. **Given** a PR is opened, **When** CI runs, **Then** type-check, lint, test, and bundle-size steps all run; any failure blocks merge.

4. **Given** the initial JS bundle is built, **When** the bundle-size gate runs, **Then** the CI step records initial bundle size (placeholder threshold; tightened as features land — final enforced limits are <=50KB initial / <=150KB total gzipped per NFR6).

5. **Given** Playwright is installed, **When** the smoke test suite runs, **Then** at least one end-to-end smoke test passes against the running app.

6. **And** all workspace scripts (`dev`, `build`, `test`, `typecheck`, `lint`) are documented in the root README.

## Tasks / Subtasks

- [x] Task 1: Initialize pnpm workspace monorepo structure (AC: #1)
  - [x] 1.1 Create root `package.json` with workspace scripts (`dev`, `build`, `test`, `typecheck`, `lint`)
  - [x] 1.2 Create `pnpm-workspace.yaml` defining `apps/*` and `packages/*`
  - [x] 1.3 Create `.nvmrc` pinning Node >= 20 LTS
  - [x] 1.4 Create `.npmrc` with pnpm config (auto-install-peers, etc.)
  - [x] 1.5 Create root `tsconfig.base.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
  - [x] 1.6 Create `.gitignore` (node_modules, dist, data/, \*.db, .env, etc.)
  - [x] 1.7 Create `.editorconfig`
- [x] Task 2: Scaffold `apps/web` via create-solid (AC: #1)
  - [x] 2.1 Run `pnpm create solid` with the `ts` template (plain SolidJS + Vite + TypeScript, NOT SolidStart)
  - [x] 2.2 Update `apps/web/tsconfig.json` to extend `../../tsconfig.base.json` and reference `../../packages/shared`
  - [x] 2.3 Install and configure Tailwind v4 (`tailwindcss`, `@tailwindcss/vite`)
  - [x] 2.4 Create `apps/web/src/styles/globals.css` with placeholder `@theme` block
  - [x] 2.5 Create `apps/web/src/styles/tailwind.css` with `@import "tailwindcss"`
  - [x] 2.6 Update `vite.config.ts` to include `vite-plugin-solid` and `@tailwindcss/vite`
  - [x] 2.7 Add proxy config in `vite.config.ts` to forward `/tasks` and `/health` to `:3000`
  - [x] 2.8 Add `<meta name="robots" content="noindex, nofollow">` to `index.html`
  - [x] 2.9 Remove any create-solid boilerplate/demo content; keep minimal App component
- [x] Task 3: Scaffold `apps/api` hand-built (AC: #1, #2)
  - [x] 3.1 Create `apps/api/package.json` with Fastify, tsx, TypeScript dependencies
  - [x] 3.2 Create `apps/api/tsconfig.json` extending root base config and referencing shared
  - [x] 3.3 Create `apps/api/src/server.ts` — minimal Fastify bootstrap with `GET /health` returning 200
  - [x] 3.4 Create `apps/api/src/routes/health.ts` route handler
  - [x] 3.5 Add `dev` script using `tsx watch` on `:3000`
- [x] Task 4: Scaffold `packages/shared` (AC: #1)
  - [x] 4.1 Create `packages/shared/package.json` with TypeScript + Zod dependencies
  - [x] 4.2 Create `packages/shared/tsconfig.json` extending root base
  - [x] 4.3 Create `packages/shared/src/index.ts` with placeholder exports
  - [x] 4.4 Create `packages/shared/src/schema.ts` with placeholder Zod schemas (Task type stub)
  - [x] 4.5 Configure package.json `exports` field for workspace consumption
- [x] Task 5: Configure ESLint and Prettier (AC: #3)
  - [x] 5.1 Create root `eslint.config.js` with: `no-default-export`, `no-console`, per-workspace globals
  - [x] 5.2 Create `.prettierrc`
  - [x] 5.3 Configure ESLint per-workspace overrides as needed
- [x] Task 6: Set up GitHub Actions CI (AC: #3, #4)
  - [x] 6.1 Create `.github/workflows/ci.yml` with jobs: `lint`, `typecheck`, `test`, `bundle-budget`
  - [x] 6.2 `lint` job: ESLint + Prettier check
  - [x] 6.3 `typecheck` job: `tsc --noEmit` across workspace
  - [x] 6.4 `test` job: `vitest run` (placeholder tests pass)
  - [x] 6.5 `bundle-budget` job: create `scripts/check-bundle-size.ts` with placeholder threshold; assert against `apps/web/dist/`
  - [x] 6.6 Configure branch protection: require all CI jobs to pass before merge
- [x] Task 7: Install and configure testing tools (AC: #5)
  - [x] 7.1 Install Vitest as the unit test framework
  - [x] 7.2 Install Playwright for E2E tests
  - [x] 7.3 Create `tests/e2e/smoke.spec.ts` — verifies app loads and health endpoint responds
  - [x] 7.4 Create Playwright config at `tests/e2e/playwright.config.ts`
  - [x] 7.5 Create at least one placeholder Vitest unit test
- [x] Task 8: Create initial documentation (AC: #6)
  - [x] 8.1 Create `README.md` with workspace scripts, thesis statement, latency budgets, and ANTI-FEATURES.md link
  - [x] 8.2 Create `docs/ANTI-FEATURES.md` enumerating FR46-54
  - [x] 8.3 Create `docs/CONTRIBUTING.md` referencing ANTI-FEATURES.md
  - [x] 8.4 Create `data/.gitkeep` for local SQLite dev directory
- [x] Task 9: Create stub infrastructure files (AC: #1)
  - [x] 9.1 Create `infra/fly.toml` placeholder
  - [x] 9.2 Create `infra/Dockerfile` placeholder
  - [x] 9.3 Create `scripts/check-anti-features.sh` with the forbidden-pattern grep list

## Dev Notes

### CRITICAL: Architecture vs Epics Discrepancies

The epics acceptance criteria contain errors that conflict with the architecture document. **The architecture document is the source of truth.** These discrepancies were introduced during epic generation:

1. **Framework**: Epics AC says "React 18" — **WRONG**. Architecture specifies **SolidJS** (`create-solid` "ts" template). Solid was chosen because React's runtime (~40KB) would exceed the 50KB initial bundle budget. Solid runtime is ~7KB.

2. **Directory name**: Epics AC says `apps/server` — **WRONG**. Architecture specifies **`apps/api`**. Use `apps/api` everywhere.

3. **Database**: Story 1.9 mentions "PostgreSQL" — **WRONG for v1**. Architecture specifies **SQLite via `better-sqlite3`**. This is relevant context for the scaffold: the `data/` directory is for local SQLite, not Postgres.

### Architecture Compliance

**Monorepo layout** (AR2):

```
bmad-todo/
├── apps/
│   ├── web/          # SolidJS SPA (create-solid "ts" template)
│   └── api/          # Fastify + TypeScript (hand-scaffolded)
├── packages/
│   └── shared/       # Zod schemas + TypeScript types
├── tests/
│   ├── e2e/          # Playwright
│   ├── perf/         # Latency benchmarks (future stories)
│   └── property/     # fast-check (future stories)
├── scripts/          # CI helper scripts
├── infra/            # Dockerfile + fly.toml
├── docs/             # ANTI-FEATURES.md, CONTRIBUTING.md, adr/
├── data/             # gitignored; local SQLite for dev
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

**TypeScript strict config** (AR2): `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true` in `tsconfig.base.json`. Each workspace package extends this.

**Node version** (AR4): Node >= 20 LTS, pinned via `.nvmrc`.

**Tailwind v4** (AR3): Use `@tailwindcss/vite` plugin (not PostCSS). Strict-token mode via custom `@theme` blocks. For this story, just install and configure the plugin with a minimal `@theme` placeholder — full token design is Story 1.2.

**ESLint rules** (AR20):

- `import/no-restricted-paths`: enforce `components -> store -> sync` (no reverse imports). Placeholder config now; exact paths finalized as components are created.
- `no-default-export`: all exports must be named
- `no-console`: error everywhere except Vite dev bootstrap file
- `no-restricted-syntax`: will add forbidden patterns (anti-feature contract) — placeholder for now

**Vite proxy** for dev: `apps/web` Vite dev server proxies `/tasks` and `/health` to `localhost:3000` so the SPA hits the same paths in dev as prod.

### Technical Stack (with versions to install)

| Technology  | Package                             | Purpose                             |
| ----------- | ----------------------------------- | ----------------------------------- |
| SolidJS     | `solid-js`                          | Frontend framework (~7KB runtime)   |
| Vite        | `vite` + `vite-plugin-solid`        | Build tool + HMR                    |
| Tailwind v4 | `tailwindcss` + `@tailwindcss/vite` | Utility CSS (strict-token mode)     |
| TypeScript  | `typescript`                        | Type safety (strict mode)           |
| Fastify     | `fastify`                           | Backend HTTP framework              |
| Zod         | `zod`                               | Runtime validation + type inference |
| Vitest      | `vitest`                            | Unit + property-based tests         |
| Playwright  | `@playwright/test`                  | E2E + a11y + visual regression      |
| pnpm        | (global)                            | Package manager + workspace support |
| ESLint      | `eslint` + plugins                  | Linting                             |
| Prettier    | `prettier`                          | Code formatting                     |

**Do NOT install yet (later stories):**

- `better-sqlite3`, `kysely` (Story 1.9 — persistence)
- `fast-check` (Story 1.6 — property tests)
- `vite-plugin-pwa`, `workbox-*` (Story 1.9 — service worker)
- `idb` (Story 1.9 — IndexedDB)
- `uuidv7` (Story 1.3 — task IDs)
- `@fastify/rate-limit` (Story 1.9 — rate limiting)
- `pino` (Story 1.9 — structured logging)
- `@axe-core/playwright` (Story 1.12 — a11y CI)

### File Naming Conventions

- **Components**: `PascalCase.tsx` — e.g., `App.tsx`, `CaptureLine.tsx`
- **Non-component modules**: `kebab-case.ts` — e.g., `task-store.ts`, `api-client.ts`
- **Backend modules**: `kebab-case.ts` — e.g., `tasks.ts`, `mappers.ts`
- **Migrations**: `NNNN_description.sql` — e.g., `0001_init.sql`
- **Test files**: co-located, same name + `.test.ts(x)` — e.g., `App.test.tsx`
- **E2E tests**: `tests/e2e/<name>.spec.ts`

### Existing Repo State

The repo currently has empty directory stubs (`apps/web/`, `apps/api/`, `packages/shared/`) with some build artifacts from a previous attempt but **NO source files** (no `package.json`, no `tsconfig.json`, no source code). These directories and their contents (`node_modules/`, `dist/`) should be cleaned up before scaffolding:

```bash
# Clean up existing stubs before scaffolding
rm -rf apps/ packages/ node_modules/ playwright-report/ test-results/
```

### CI Pipeline Structure

GitHub Actions workflow (`.github/workflows/ci.yml`):

```yaml
# Jobs for this story (skeleton — more gates added in later stories):
lint: # ESLint + Prettier check
typecheck: # tsc --noEmit across workspace
test: # vitest run
bundle-budget: # scripts/check-bundle-size.ts against apps/web/dist/
```

Future stories will add: `e2e-and-a11y`, `latency-budget`, `audit`, `stress-sync`, `deploy`.

### Anti-Feature Contract (scripts/check-anti-features.sh)

The codebase grep must block these patterns (AR18):

```
toast(, Snackbar, Toaster, Skeleton, Spinner, confirm(, alert(,
<Modal, <Dialog, Streak, Achievement, XP, Karma
```

Plus emoji patterns: `🎉`, `✨`, `🏆`

And Solid's `<ErrorBoundary>` (errors must route to annunciator, not boundary).

### Testing Approach

- **Vitest**: Unit tests. For this story, one placeholder test per workspace package that verifies the module loads.
- **Playwright**: E2E tests. One smoke test that launches the app and verifies:
  1. The web app loads (page title or root element present)
  2. `GET /health` returns 200
- Test directory structure:
  - Unit tests: co-located with source (`*.test.ts`)
  - E2E: `tests/e2e/*.spec.ts`

### Module Boundary Rules

Even though most modules are empty stubs in this story, configure the ESLint `import/no-restricted-paths` rule now:

- `components/` may import from `store/` — NOT from `sync/`
- `store/` may import from `sync/` — NOT from `components/`
- `sync/` may NOT import from `components/` or `store/`

### Project Structure Notes

- This story creates the skeleton that ALL 12 subsequent stories build on. Getting the structure right here prevents structural rewrites later.
- The monorepo uses pnpm workspaces with TypeScript project references for cross-package type safety.
- `packages/shared` is consumed by both `apps/web` and `apps/api` via workspace protocol (`"@bmad-todo/shared": "workspace:*"`).
- The web app in dev mode proxies API calls to the API server — same-origin in production (single Docker image serves both).

### References

- [Source: architecture.md#Starter Template Evaluation] — create-solid selection rationale
- [Source: architecture.md#Complete Project Directory Structure] — full file tree
- [Source: architecture.md#Core Architectural Decisions] — tech stack decisions
- [Source: architecture.md#Implementation Patterns & Consistency Rules] — naming, structure, format rules
- [Source: architecture.md#Development Workflow Integration] — dev server, build, deploy structure
- [Source: architecture.md#CI/CD] — GitHub Actions job matrix
- [Source: epics.md#Story 1.1] — acceptance criteria
- [Source: epics.md#Additional Requirements AR1-AR4, AR17-AR20, AR26] — scaffold-specific architecture requirements

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Sandbox blocked corepack cache writes to `~/.cache/node/corepack/` — workaround: `COREPACK_HOME=.corepack`
- Sandbox blocked `tsx` pipe creation in `/tmp/` — workaround: `node --experimental-strip-types` for scripts
- Used manual SolidJS scaffold instead of `create-solid` due to sandbox npx restrictions

### Completion Notes List

- Monorepo initialized with pnpm workspaces: `apps/web`, `apps/api`, `packages/shared`
- SolidJS SPA with Vite + Tailwind v4 (manually scaffolded, equivalent to create-solid ts template)
- Fastify API with `GET /health` returning 200
- Shared package with Zod Task schema stub
- ESLint flat config with no-console, no-default-export, per-workspace globals (browser/node)
- Prettier configured
- GitHub Actions CI with lint, typecheck, test, bundle-budget jobs
- Vitest unit tests: 3 passing (schema validation x2, health endpoint x1)
- Playwright E2E smoke tests written (app load + health endpoint)
- Bundle size: 2.74KB gzipped JS (budget: 50KB)
- Anti-feature check script with full forbidden-pattern list
- README, ANTI-FEATURES.md, CONTRIBUTING.md documentation complete

### Change Log

- 2026-04-27: Initial scaffold implementation — all 9 tasks completed

### File List

- package.json (new)
- pnpm-workspace.yaml (new)
- tsconfig.base.json (new)
- tsconfig.json (new)
- .nvmrc (new)
- .npmrc (new)
- .gitignore (modified)
- .editorconfig (new)
- .prettierrc (new)
- eslint.config.js (new)
- vitest.config.ts (new)
- README.md (new)
- apps/web/package.json (new)
- apps/web/tsconfig.json (new)
- apps/web/vite.config.ts (new)
- apps/web/index.html (new)
- apps/web/src/index.tsx (new)
- apps/web/src/App.tsx (new)
- apps/web/src/styles/tailwind.css (new)
- apps/web/src/styles/globals.css (new)
- apps/api/package.json (new)
- apps/api/tsconfig.json (new)
- apps/api/src/server.ts (new)
- apps/api/src/routes/health.ts (new)
- apps/api/src/routes/health.test.ts (new)
- packages/shared/package.json (new)
- packages/shared/tsconfig.json (new)
- packages/shared/src/index.ts (new)
- packages/shared/src/schema.ts (new)
- packages/shared/src/schema.test.ts (new)
- tests/e2e/smoke.spec.ts (new)
- tests/e2e/playwright.config.ts (new)
- scripts/check-bundle-size.ts (new)
- scripts/check-anti-features.sh (new)
- .github/workflows/ci.yml (new)
- infra/fly.toml (new)
- infra/Dockerfile (new)
- docs/ANTI-FEATURES.md (new)
- docs/CONTRIBUTING.md (new)
- data/.gitkeep (new)

### Review Findings

**Patch (fix these):**

- [x] [Review][Patch] Add `concurrently` to dev script — replace & backgrounding with labeled output and crash propagation [package.json]
- [x] [Review][Patch] Narrow ESLint `ignores` pattern — `**/*.config.*` is too broad; only ignore `eslint.config.js` itself [eslint.config.js]
- [x] [Review][Patch] Add `eslint-plugin-import` + `no-restricted-paths` rule placeholder — components→store→sync boundary as specified in Dev Notes [eslint.config.js]
- [x] [Review][Patch] server.ts has no error handling around app.listen() — unhandled rejection on port conflict [apps/api/src/server.ts:6-10]
- [x] [Review][Patch] PORT env var not validated — Number('abc') is NaN; Fastify listens on NaN port [apps/api/src/server.ts:8]
- [x] [Review][Patch] Non-null assertion on getElementById('root') — passes null to render() if element missing [apps/web/src/index.tsx:5]
- [x] [Review][Patch] Duplicate imports from node:fs — readFileSync imported twice [scripts/check-bundle-size.ts:1,3]
- [x] [Review][Patch] No guard when dist/assets directory missing — readdirSync throws ENOENT, no actionable message [scripts/check-bundle-size.ts:15]
- [x] [Review][Patch] Empty build silently passes bundle check — 0 KB totals always pass [scripts/check-bundle-size.ts:15]
- [x] [Review][Patch] import.meta.dirname unavailable before Node 20.11 — .nvmrc pins '20' which includes 20.0–20.10 [scripts/check-bundle-size.ts:6]
- [x] [Review][Patch] $SEARCH_DIRS unquoted in grep call — breaks on paths with spaces; use array expansion [scripts/check-anti-features.sh:31]
- [x] [Review][Patch] Anti-features grep matches .md files — ErrorBoundary in ANTI-FEATURES.md causes false positive in CI [scripts/check-anti-features.sh]
- [x] [Review][Patch] \bXP\b word-boundary broken on macOS BSD grep -E [scripts/check-anti-features.sh]
- [x] [Review][Patch] check-anti-features.sh never invoked in CI — violations can reach main undetected [.github/workflows/ci.yml]
- [x] [Review][Patch] E2E smoke tests have no CI job — AC5 violated; smoke.spec.ts never runs in CI [.github/workflows/ci.yml]
- [x] [Review][Patch] bundle-budget CI job uses npx tsx — may pick a different version than locked in pnpm-lock.yaml [.github/workflows/ci.yml:58]
- [x] [Review][Patch] playwright.config.ts inside tests/e2e/ — pnpm test:e2e from root won't find it without --config [tests/e2e/playwright.config.ts]
- [x] [Review][Patch] @types/node missing from apps/api devDependencies [apps/api/package.json]
- [x] [Review][Patch] TaskSchema.id and .title accept empty strings — add .min(1) constraint [packages/shared/src/schema.ts]
- [x] [Review][Patch] no-restricted-exports doesn't block export { foo as default } — doesn't fully implement no-default-export constraint [eslint.config.js]
- [x] [Review][Patch] Playwright webServer has no readiness timeout — slow CI start may time out at 60s default [tests/e2e/playwright.config.ts]

**Deferred (pre-existing, not actionable now):**

- [x] [Review][Defer] Vite proxy target hardcoded to localhost:3000 [apps/web/vite.config.ts] — deferred, pre-existing; environment-configurable proxy is future work
- [x] [Review][Defer] TaskSchema missing updatedAt/order fields [packages/shared/src/schema.ts] — deferred, pre-existing; schema design for later stories
- [x] [Review][Defer] GET /health has no dependency checks [apps/api/src/routes/health.ts] — deferred, pre-existing; appropriate scope for scaffold story
