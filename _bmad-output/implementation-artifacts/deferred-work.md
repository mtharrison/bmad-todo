# Deferred Work

## Deferred from: code review of 1-1-repository-scaffold-and-ci-foundation (2026-04-27)

- Vite proxy target hardcoded to localhost:3000 — environment-configurable proxy is future work; acceptable for scaffold
- TaskSchema missing updatedAt/order fields — schema design decisions for later stories
- GET /health has no dependency checks — appropriate scope for scaffold story; address when real dependencies exist
