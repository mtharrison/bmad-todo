# Deferred Work

## Deferred from: code review of 1-2 + 1-3 (2026-04-27)

- `shamefully-hoist=true` in `apps/web/.npmrc` defeats pnpm strict isolation — pre-existing infra decision from Story 1.2 sandbox compatibility
- `pnpm.overrides` for `resolve` package lacks inline documentation — workaround for sandbox `.gitmodules` copy issue with `resolve@2.0.0-next.6`
- E2E tests (smoke.spec.ts, j4-first-ever-visit.spec.ts) assume desktop viewport for auto-focus assertions — will fail if mobile viewport added to Playwright config
- No maximum task count or text length limit in `task-store.ts` — address when persistence lands in Story 1.9

## Deferred from: code review of 1-1-repository-scaffold-and-ci-foundation (2026-04-27)

- Vite proxy target hardcoded to localhost:3000 — environment-configurable proxy is future work; acceptable for scaffold
- TaskSchema missing updatedAt/order fields — schema design decisions for later stories
- GET /health has no dependency checks — appropriate scope for scaffold story; address when real dependencies exist
