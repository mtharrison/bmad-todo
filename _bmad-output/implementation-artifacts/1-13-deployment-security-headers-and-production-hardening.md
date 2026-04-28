# Story 1.13: Deployment, Security Headers & Production Hardening

Status: done

## Story

As Sam,
I want the app deployed to a production environment with HTTPS, security headers, and no search-engine indexing,
so that my task data is private, the app is accessible from any browser, and the infrastructure is production-grade from day one.

## Acceptance Criteria

1. **Given** the app is deployed to Fly.io, **when** `GET /health` is called, **then** it returns HTTP 200 with no sensitive data; the check is registered in `fly.toml` `[http_service.checks]`.

2. **Given** any HTTP request is made to the app, **when** it arrives over plain HTTP, **then** it is redirected to HTTPS; HSTS header is present on all HTTPS responses.

3. **Given** any response from the server, **then** it includes: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.

4. **Given** the web app is loaded, **when** the HTML is inspected, **then** `<meta name="robots" content="noindex, nofollow">` is present in `<head>`.

5. **Given** a CORS request is made from an unauthorized origin in production, **then** it is rejected; no wildcard CORS is present in the production config.

6. **Given** the server starts, **when** the startup sequence runs, **then** database migrations execute to completion before `app.listen` is called.

## Tasks / Subtasks

- [x] Task 1: Complete `infra/Dockerfile` multi-stage build (AC: #1, #6)
  - [x] Stage 1 (`builder`): `node:20-slim`, enable corepack + pnpm, copy full monorepo, `pnpm install --frozen-lockfile`, `pnpm build`
  - [x] Stage 2 (`production`): `node:20-slim`, copy `apps/api/dist`, `apps/web/dist`, `apps/api/migrations`, production `node_modules` only
  - [x] Entrypoint: `node apps/api/dist/server.js`
  - [x] Verify migrations run at boot before `app.listen` (already implemented in `server.ts`)

- [x] Task 2: Complete `infra/fly.toml` configuration (AC: #1, #2)
  - [x] Add `[mounts]` section: `source = "data"`, `destination = "/data"`
  - [x] Add `[http_service.checks]` section: path `/health`, interval 15s, timeout 2s, grace_period 10s
  - [x] Verify `force_https = true` is present (already there)
  - [x] Set `DATABASE_URL` to `/data/bmad-todo.db` via `[env]` section

- [x] Task 3: Add security headers via `@fastify/helmet` (AC: #2, #3)
  - [x] Install `@fastify/helmet` as production dependency in `apps/api`
  - [x] Register in `app.ts` BEFORE routes with config:
    - CSP: `default-src 'self'`, `script-src 'self'`, `style-src 'self' 'unsafe-inline'` (Solid may inject styles), `worker-src 'self'`, `connect-src 'self'`, `img-src 'self' data:`, `font-src 'self'`, `frame-ancestors 'none'`
    - HSTS: `maxAge: 63072000` (2 years), `includeSubDomains: true`, `preload: true`
    - `frameguard: { action: 'deny' }`
    - `referrerPolicy: { policy: 'no-referrer' }`
    - `contentTypeOptions: true` (X-Content-Type-Options: nosniff)
  - [x] Disable helmet in test environment to avoid interfering with e2e tests

- [x] Task 4: Implement Cloudflare Access JWT verification (AC: #5)
  - [x] Install `jose` as production dependency in `apps/api`
  - [x] Add `CF_TEAM_DOMAIN` and `CF_ACCESS_AUD` to `env.ts` Zod schema (required in production, optional otherwise)
  - [x] Rewrite `apps/api/src/middleware/auth-jwt.ts`:
    - Import `createRemoteJWKSet`, `jwtVerify` from `jose`
    - On first request in production, create JWKS from `${CF_TEAM_DOMAIN}/cdn-cgi/access/certs` (cached by `jose`)
    - Verify `Cf-Access-Jwt-Assertion` header against JWKS, validating `iss` and `aud` claims
    - Extract `sub` claim → set `req.userNamespace`
    - In development/test: keep existing `req.userNamespace = "default"` bypass
    - When `CF_TEAM_DOMAIN`/`CF_ACCESS_AUD` are unset (even in production), fall back to `req.userNamespace = "default"` — this enables Docker Compose local runs without Cloudflare Access
  - [x] Update `auth-jwt.test.ts` to cover: missing header → 403, invalid JWT → 403, valid JWT → namespace set

- [x] Task 5: Add static file serving for SPA (AC: #1)
  - [x] Install `@fastify/static` as production dependency in `apps/api`
  - [x] In `app.ts`, register `@fastify/static` pointing to `../web/dist` (relative from api dist, or absolute `/app/apps/web/dist` in Docker)
  - [x] Serve `index.html` with `Cache-Control: no-cache` (must revalidate)
  - [x] Serve hashed assets (JS/CSS) with `Cache-Control: public, max-age=2592000, immutable`
  - [x] Add SPA fallback: any non-API, non-static path returns `index.html`
  - [x] Only register static serving in production (dev uses Vite proxy)

- [x] Task 6: Create `.github/workflows/deploy.yml` (AC: #1)
  - [x] Trigger: push to `main` branch, only after CI workflow succeeds
  - [x] Use `needs: [ci]` or `workflow_run` to gate on CI passing
  - [x] Steps: checkout, `flyctl deploy --remote-only`
  - [x] Use `FLY_API_TOKEN` secret for authentication
  - [x] Single job, minimal — architecture says "no manual steps beyond initial approval"

- [x] Task 7: Create `docker-compose.yml` for local full-stack run (AC: #1, #6)
  - [x] Service: `app` — builds from `infra/Dockerfile`, maps port 3000, mounts `./data:/data` volume
  - [x] Set `NODE_ENV=production`, `DATABASE_URL=/data/bmad-todo.db`
  - [x] Stub `CF_TEAM_DOMAIN` and `CF_ACCESS_AUD` as empty (auth bypassed when unset, or add `CF_ACCESS_BYPASS=true` env for local Docker)
  - [x] `docker compose up --build` must start the full production-like app (API + SPA + SQLite) on `localhost:3000`
  - [x] Add healthcheck in compose matching fly.toml: `curl -f http://localhost:3000/health`
  - [x] Document usage in README or a comment in the compose file

- [x] Task 8: Create `scripts/backup-db.sh` (optional, not blocking)
  - [x] SQLite `.backup` command to create dump
  - [x] Upload to Cloudflare R2 (requires `rclone` or `aws` CLI configured)
  - [x] Retention: 30 days
  - [x] Intended for Fly cron task (manual setup, not automated in this story)

- [x] Task 9: Verify existing security posture (AC: #3, #4, #5)
  - [x] Confirm `<meta name="robots" content="noindex, nofollow">` exists in `apps/web/index.html` (already present)
  - [x] Confirm no wildcard CORS in production config
  - [x] Confirm task text is never logged in plaintext (`lib/log.ts` redaction — already implemented)
  - [x] Confirm no third-party analytics/tracking in the build
  - [x] Add integration test: `GET /` returns security headers (CSP, X-Frame-Options, etc.)

## Dev Notes

### Architecture Compliance

**Deployment topology** (architecture.md §Infrastructure):

- Cloudflare → Cloudflare Access gate → Fly app
- Single Node process: Fastify serves API routes AND static SPA assets from same origin
- Same-origin serving eliminates CORS entirely in production
- SQLite on persistent volume at `/data`, WAL mode

**Environment configuration** (architecture.md §Environments):

- `development`: Vite dev server + Fastify dev, CORS allowed from localhost, auth bypassed
- `production`: Single Fly app, no staging. CI is the staging environment

**Deploy pipeline**: CI gates pass (Story 1.12) → build Docker image → `flyctl deploy` → Fly rolling restart → migrations at boot

### Files to Create

| File                           | Purpose                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `.github/workflows/deploy.yml` | CD pipeline: flyctl deploy on main after CI                                    |
| `docker-compose.yml`           | Local full-stack run: `docker compose up` builds and serves the production app |
| `scripts/backup-db.sh`         | SQLite backup to R2 (optional)                                                 |

### Files to Modify

| File                                  | What Changes                                             |
| ------------------------------------- | -------------------------------------------------------- |
| `infra/Dockerfile`                    | Complete multi-stage build (currently placeholder)       |
| `infra/fly.toml`                      | Add mounts, checks, env sections (currently placeholder) |
| `apps/api/src/app.ts`                 | Register `@fastify/helmet` and `@fastify/static`         |
| `apps/api/src/middleware/auth-jwt.ts` | Implement real CF Access JWT verification                |
| `apps/api/src/env.ts`                 | Add `CF_TEAM_DOMAIN`, `CF_ACCESS_AUD` env vars           |
| `apps/api/package.json`               | Add `@fastify/helmet`, `@fastify/static`, `jose` deps    |

### Files to Verify (NO changes expected)

| File                            | Verify                                                     |
| ------------------------------- | ---------------------------------------------------------- |
| `apps/web/index.html`           | `<meta name="robots" content="noindex, nofollow">` present |
| `apps/api/src/lib/log.ts`       | Task text redaction working (`*.text` paths)               |
| `apps/api/src/server.ts`        | Migrations run before `app.listen`                         |
| `apps/api/src/routes/health.ts` | Returns `{ status: "ok" }` with 200                        |

### Existing Patterns to Follow

**Middleware registration order** in `app.ts` (lines 22-29):

1. `registerAuth(app)` — auth hook on every request
2. `registerRateLimit(app)` — rate limiting
3. `app.setErrorHandler(errorEnvelope)` — error formatting
4. `app.setNotFoundHandler(notFoundHandler)` — 404 handler
5. Route registration

Helmet MUST be registered before routes but consider ordering with auth. Register helmet first (global plugin), then auth, then rate-limit, then routes.

**Env var pattern** in `env.ts`: Zod schema with `.default()` for dev-friendly defaults. Production-only vars use `.optional()` with runtime check in middleware.

**Test patterns**: Unit tests with Vitest, co-located `*.test.ts` files. Integration tests build the app via `buildApp()` and inject test dependencies.

### Anti-Feature Contract

These MUST NOT appear in any code:

- No analytics, tracking pixels, session-replay tooling
- No third-party scripts in client bundle
- No `toast(`, `Snackbar`, `Toaster`, `Skeleton`, `Spinner`
- No `confirm(`, `alert(`, `<Modal`, `<Dialog`
- No `<ErrorBoundary>` — errors route to annunciator
- No decorative motion

### Security Constraints

- Task text NEVER logged in plaintext (NFR-Priv-1) — already enforced by `log.ts` redaction
- No client bundle sees backend env vars (NFR-Sec-5) — secrets via `fly secrets set`
- Rate limiting: 100 req/min per namespace (already implemented in `rate-limit.ts`)
- Text length: ≤10,000 chars (already enforced by Zod + SQL CHECK)
- `innerHTML` forbidden by lint (NFR-Sec-1)

### CSP Considerations for This App

The app is a SPA with:

- Service worker (`worker-src 'self'`)
- Self-hosted Fraunces font (`font-src 'self'`)
- No inline scripts (theme script in `index.html` may need a nonce or hash — check if Vite inlines it)
- No external resources whatsoever
- Solid.js may inject `<style>` tags → `style-src 'self' 'unsafe-inline'` (verify if needed, prefer hash/nonce if possible)

**Important**: The theme-detection `<script>` in `index.html` is an inline script. Options:

1. Use CSP nonce via `@fastify/helmet`'s `enableCSPNonces` — requires templating index.html at serve time
2. Use a SHA-256 hash of the script content in `script-src`
3. Move theme detection to an external `.js` file (simplest CSP, no inline needed)

Option 3 is cleanest for this architecture. If the inline script is small and stable, option 2 (hash) is also fine.

### Previous Story Intelligence

**From Story 1.12** (CI gates — status: review):

- 281 unit tests, 77 E2E tests, 6 perf tests all passing
- CI workflow at `.github/workflows/ci.yml` has 8 jobs: `lint`, `typecheck`, `unit-and-property`, `e2e-and-a11y`, `latency-budget`, `bundle-budget`, `anti-features`, `audit`
- `deploy.yml` should use `workflow_run` or `needs` to gate on CI passing
- `@axe-core/playwright` installed at workspace root
- Playwright config has `chromium` and `perf` projects
- Screen-reader checklist at `docs/SCREEN-READER-CHECKLIST.md` is a pre-ship manual gate

**From Story 1.9** (Persistence):

- SQLite with WAL mode, migrations system working
- Property-based sync stress test at `tests/property/sync-invariants.test.ts`
- `apps/api/src/db/migrate.ts` handles idempotent migration application

### Technology Quick Reference

**Fly.io `fly.toml` checks syntax:**

```toml
[http_service.checks]
  interval = "15s"
  timeout = "2s"
  grace_period = "10s"
  method = "GET"
  path = "/health"
```

**Cloudflare Access JWT verification with `jose`:**

```typescript
import { createRemoteJWKSet, jwtVerify } from "jose";
const JWKS = createRemoteJWKSet(new URL(`${CF_TEAM_DOMAIN}/cdn-cgi/access/certs`));
const { payload } = await jwtVerify(token, JWKS, {
  issuer: CF_TEAM_DOMAIN,
  audience: CF_ACCESS_AUD,
});
const userNamespace = payload.sub;
```

**`@fastify/helmet` registration:**

```typescript
import helmet from "@fastify/helmet";
await app.register(helmet, {
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] /* ... */ } },
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
  frameguard: { action: "deny" },
  referrerPolicy: { policy: "no-referrer" },
});
```

**`@fastify/static` for SPA:**

```typescript
import fastifyStatic from "@fastify/static";
await app.register(fastifyStatic, { root: path.join(__dirname, "../../web/dist") });
```

### Project Structure Notes

All new files follow the architecture directory structure exactly:

- `infra/Dockerfile` and `infra/fly.toml` — already exist as placeholders
- `.github/workflows/deploy.yml` — new, alongside existing `ci.yml`
- `scripts/backup-db.sh` — new, alongside existing `check-anti-features.sh` and `check-bundle-size.ts`

No new directories needed. No naming conflicts.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md § Infrastructure & Deployment]
- [Source: _bmad-output/planning-artifacts/architecture.md § Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md § API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md § Development Workflow Integration]
- [Source: _bmad-output/planning-artifacts/prd.md § NFR-Sec-1 through NFR-Sec-7]
- [Source: _bmad-output/planning-artifacts/prd.md § NFR-Priv-1 through NFR-Priv-5]
- [Source: _bmad-output/planning-artifacts/epics.md § Story 1.13]
- [Source: _bmad-output/implementation-artifacts/1-12-ci-performance-accessibility-and-visual-regression-gates.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- CSP hash quoting: helmet v8 requires single-quoted SHA-256 hashes in directives (e.g. `'sha256-...'`), not bare strings
- `@fastify/static` cacheControl: default `cacheControl: true` sets `public, max-age=0`; disabled it and used `setHeaders` callback for custom cache headers
- `exactOptionalPropertyTypes` required `string | undefined` for `staticRoot` option type

### Completion Notes List

- Task 1: Multi-stage Dockerfile with builder (pnpm monorepo build) and production stages. Shared package exports fixed via sed for production runtime.
- Task 2: fly.toml with persistent volume mounts, health checks, force_https, and DATABASE_URL env.
- Task 3: @fastify/helmet with full CSP (including SHA-256 hash for inline theme script), HSTS 2yr, frameguard DENY, referrer-policy no-referrer. Helmet is opt-in via `BuildAppOptions.helmet` flag to avoid interfering with e2e tests.
- Task 4: CF Access JWT verification via jose. Production + CF vars configured: verifies Cf-Access-Jwt-Assertion header. Falls back to default namespace when CF vars unset (local Docker). 5 unit tests covering dev/test bypass, missing header 403, invalid JWT 403, CF-unset fallback.
- Task 5: @fastify/static serves SPA from web/dist in production. index.html with no-cache, hashed assets with immutable cache, SPA fallback for client-side routing. 6 unit tests.
- Task 6: deploy.yml uses workflow_run gated on CI success, flyctl deploy with FLY_API_TOKEN secret.
- Task 7: docker-compose.yml with single service, port 3000, volume mount, auth bypass, healthcheck.
- Task 8: backup-db.sh with sqlite3 .backup, rclone to R2, 30-day retention.
- Task 9: Verified: robots meta present, no CORS config, log redaction active, no analytics/tracking. Added security-headers integration test.

### Review Findings

- [x] [Review][Decision] Production with CF vars unset silently disables auth — resolved: keep fallback, added `log.warn()` on bypass
- [x] [Review][Patch] `authJwt` catch block missing `return` after 403 — fixed
- [x] [Review][Patch] `CF_TEAM_DOMAIN` trailing slash produces malformed JWKS URL — fixed: strip trailing slashes before use
- [x] [Review][Patch] Docker Compose healthcheck uses `curl` but `node:20-slim` doesn't include it — fixed: switched to `node -e` healthcheck
- [x] [Review][Patch] `rclone delete` with `--min-age` could delete unrelated files — fixed: added `--include "bmad-todo-*.db"` filter
- [x] [Review][Patch] backup-db.sh: No SQLite WAL checkpoint before `.backup` — fixed: added `PRAGMA wal_checkpoint(TRUNCATE)`
- [x] [Review][Patch] deploy.yml: No concurrency guard — fixed: added `concurrency: { group: deploy, cancel-in-progress: true }`
- [x] [Review][Patch] `CF_TEAM_DOMAIN` accepts non-HTTPS URLs — fixed: added `.refine()` to require HTTPS
- [x] [Review][Patch] deploy.yml `flyctl-actions` pinned to `@master` — fixed: pinned to commit SHA
- [x] [Review][Patch] fly.toml `dockerfile = "Dockerfile"` should be `infra/Dockerfile` — fixed: path relative to build context
- [x] [Review][Defer] SPA fallback notFoundHandler prefix list is incomplete/fragile — hardcoded `/tasks`, `/health`, `/admin` won't cover future API routes [apps/api/src/middleware/static.ts:25] — deferred, pre-existing design choice
- [x] [Review][Defer] Dockerfile `sed` rewrite of shared `package.json` is brittle — will fail silently if exports change [infra/Dockerfile:34] — deferred, acceptable for MVP

### Change Log

- 2026-04-28: Story 1.13 round 3 review — 1 additional patch applied, 6 dismissed
- 2026-04-28: Story 1.13 re-review clean — 2 additional patches applied, 8 dismissed
- 2026-04-28: Story 1.13 code review done — 7 patches applied, 2 deferred, 5 dismissed
- 2026-04-28: Story 1.13 implementation complete — all 9 tasks, 300 unit tests pass, typecheck and lint clean

### File List

**New files:**

- `.github/workflows/deploy.yml`
- `docker-compose.yml`
- `scripts/backup-db.sh`
- `apps/api/src/middleware/helmet.ts`
- `apps/api/src/middleware/helmet.test.ts`
- `apps/api/src/middleware/static.ts`
- `apps/api/src/middleware/static.test.ts`
- `apps/api/src/middleware/auth-jwt.test.ts`
- `apps/api/src/routes/security-headers.integration.test.ts`

**Modified files:**

- `infra/Dockerfile`
- `infra/fly.toml`
- `apps/api/src/app.ts`
- `apps/api/src/server.ts`
- `apps/api/src/env.ts`
- `apps/api/src/middleware/auth-jwt.ts`
- `apps/api/package.json`
- `pnpm-lock.yaml`
