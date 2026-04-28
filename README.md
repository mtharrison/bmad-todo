# bmad-todo

A deliberately minimal, character-rich personal todo app. Speed and simplicity over features.

**Thesis:** A todo app that feels faster than thought, with personality expressed through typography and animation — not through gamification, modals, or feature bloat.

**p95 Latency budgets:**

- Keystroke → render: < 16ms
- Completion → strikethrough: < 50ms
- Enter → task visible: < 100ms
- Cold start → interactive: < 500ms
- Initial JS bundle: ≤ 50KB gzipped
- Total assets: ≤ 150KB gzipped

Dev mode (`Cmd+Shift+L` / `Ctrl+Shift+L`) shows live p95 latency versus these budgets.

## Tech Stack

- **Frontend:** SolidJS + Vite + Tailwind v4
- **Backend:** Fastify + TypeScript
- **Shared:** Zod schemas + TypeScript types
- **Database:** SQLite (via better-sqlite3, added in Story 1.9)

## Workspace Scripts

| Script           | Description                               |
| ---------------- | ----------------------------------------- |
| `pnpm dev`       | Start both API and web dev servers        |
| `pnpm build`     | Build all workspace packages              |
| `pnpm test`      | Run Vitest unit tests                     |
| `pnpm test:e2e`  | Run Playwright E2E tests                  |
| `pnpm typecheck` | TypeScript type checking across workspace |
| `pnpm lint`      | Run ESLint                                |
| `pnpm format`    | Check Prettier formatting                 |

## Project Structure

```
bmad-todo/
├── apps/
│   ├── web/          # SolidJS SPA
│   └── api/          # Fastify API server
├── packages/
│   └── shared/       # Zod schemas + TypeScript types
├── tests/
│   └── e2e/          # Playwright E2E tests
├── scripts/          # CI helper scripts
├── infra/            # Dockerfile + fly.toml
├── docs/             # Project documentation
└── data/             # Local SQLite (gitignored)
```

## Anti-Features

This project has an explicit [anti-feature contract](docs/ANTI-FEATURES.md) — a list of patterns and UX approaches that are deliberately excluded.
