<h1 align="center">⚡ bmad-todo</h1>

<p align="center">
  <em>A todo app that feels faster than thought.</em>
</p>

<p align="center">
  <a href="#-features"><img src="https://img.shields.io/badge/Features-SolidJS%20%2B%20Fastify-blue?style=flat-square" alt="Features" /></a>
  <a href="#-performance-budgets"><img src="https://img.shields.io/badge/p95%20Latency-%3C%2016ms-brightgreen?style=flat-square" alt="Latency" /></a>
  <a href="#-accessibility"><img src="https://img.shields.io/badge/WCAG%202.1-AA%20Compliant-purple?style=flat-square" alt="Accessibility" /></a>
  <a href="#-anti-features"><img src="https://img.shields.io/badge/Anti--Features-9%20Commitments-red?style=flat-square" alt="Anti-Features" /></a>
  <a href="#-offline-first"><img src="https://img.shields.io/badge/Offline-First-orange?style=flat-square" alt="Offline First" /></a>
  <img src="https://img.shields.io/badge/Bundle-%E2%89%A4%2050KB%20gzip-yellow?style=flat-square" alt="Bundle Size" />
</p>

<p align="center">
  <a href="https://github.com/mtharrison/bmad-todo/actions"><img src="https://img.shields.io/github/actions/workflow/status/mtharrison/bmad-todo/ci.yml?style=flat-square&label=CI&logo=github" alt="CI Status" /></a>
</p>

---

## 🎯 Thesis

> A todo app with personality expressed through **typography and animation** — not through gamification, modals, or feature bloat. Speed and simplicity over features. Always.

If it needs a loading spinner, it's too slow. If it needs a confirmation dialog, it needs undo instead. If it needs gamification, the core experience isn't compelling enough. If it needs a tutorial, the interface isn't clear enough.

---

## ✨ Features

| | Feature | Details |
|---|---|---|
| ⌨️ | **Keyboard-First** | Vim-inspired bindings — navigate, edit, complete, and delete without touching the mouse |
| 🔄 | **Instant Undo** | Session-long undo stack — no confirmation dialogs, just `u` to reverse any action |
| ✏️ | **Inline Editing** | Press `e` to edit in-place — no modals, no popups, no context switches |
| 🌗 | **Dark & Light Themes** | Toggle with `t` — respects `prefers-color-scheme` on first visit |
| 📡 | **Offline-First** | Service worker + IndexedDB — works without a connection, syncs when back online |
| ♿ | **Accessible** | WCAG 2.1 AA — screen reader tested, keyboard-only navigable, reduced motion support |
| 📏 | **Performance Obsessed** | Every interaction has a p95 latency budget enforced in CI |

---

## ⌨️ Keyboard Shortcuts

bmad-todo is designed to be driven entirely from the keyboard.

| Key | Action |
|-----|--------|
| `n` | 📝 New task (focus capture line) |
| `j` / `↓` | ⬇️ Move focus down |
| `k` / `↑` | ⬆️ Move focus up |
| `x` | ✅ Toggle task completion |
| `e` | ✏️ Edit task inline |
| `d` | 🗑️ Delete task (soft delete) |
| `u` | ↩️ Undo last action |
| `t` | 🌗 Toggle theme |
| `Enter` | ✓ Confirm edit / Submit task |
| `Escape` | ✕ Cancel edit |
| `Ctrl/⌘ + Enter` | 🎯 Focus capture line from anywhere |
| `Ctrl/⌘ + Shift + L` | 📊 Toggle dev latency overlay |

---

## 🏎️ Performance Budgets

Every interaction has an enforced **p95 latency budget** — verified in CI, visible in dev mode.

```
 Interaction                  Budget          
╔══════════════════════════════╦═════════════════╗
║ Keystroke → render           ║     < 16ms  ⚡  ║
║ Completion → strikethrough   ║     < 50ms  ⚡  ║
║ Enter → task visible         ║    < 100ms  🚀  ║
║ Cold start → interactive     ║    < 500ms  🔥  ║
╠══════════════════════════════╬═════════════════╣
║ Initial JS bundle (gzip)     ║     ≤ 50KB  📦  ║
║ Total assets (gzip)          ║    ≤ 150KB  📦  ║
╚══════════════════════════════╩═════════════════╝
```

Toggle the **dev latency overlay** with `Ctrl/⌘ + Shift + L` to see live p95 measurements against these budgets while developing.

---

## 🚫 Anti-Features

This project has an explicit [Anti-Feature Contract](docs/ANTI-FEATURES.md) — a list of patterns **deliberately excluded**. Their absence is a feature, not a gap.

| | Commitment | Why |
|---|---|---|
| 🚫 | No onboarding tours or tutorials | If it needs a tutorial, the interface isn't clear enough |
| 🚫 | No usage stats or time tracking | A task list is not a productivity tracker |
| 🚫 | No streaks, points, or gamification | Productivity tools should not manipulate behavior |
| 🚫 | No social sharing or leaderboards | Tasks are private; comparison is corrosive |
| 🚫 | No re-engagement notifications | The app serves the user, not the other way around |
| 🚫 | No autocomplete that rewrites text | The user owns every character |
| 🚫 | No sounds by default | Silence is the default |
| 🚫 | No decorative animations | Motion budget is reserved for meaningful state changes |
| 🚫 | No AI-based reordering | The user's order is the correct order |

**Banned UI patterns:** toasts, skeleton loaders, spinners, confirmation dialogs, modals, celebration emoji. Enforced in CI via `scripts/check-anti-features.sh`.

---

## 📡 Offline-First

bmad-todo works without a network connection and syncs seamlessly when reconnected.

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│  SolidJS UI │────▶│  IndexedDB   │────▶│ Service Worker│
│  (reactive) │     │  (local DB)  │     │  (outbox sync)│
└─────────────┘     └──────────────┘     └───────┬───────┘
                                                  │
                                          ┌───────▼───────┐
                                          │  Fastify API  │
                                          │  + SQLite DB  │
                                          └───────────────┘
```

- **Outbox pattern** — mutations queue locally and replay on reconnect
- **Idempotency keys** — prevents duplicate server-side mutations
- **Automatic reconciliation** — merges server state when back online
- **Annunciator status line** — shows sync state and errors (no toasts!)

---

## ♿ Accessibility

WCAG 2.1 AA compliant — tested with both automated tools and manual screen reader verification.

- 🔍 **Automated audits** via `axe-core` in CI (zero violations policy)
- 🗣️ **Screen reader tested** — VoiceOver on macOS/iOS Safari ([checklist](docs/SCREEN-READER-CHECKLIST.md))
- ⌨️ **Keyboard-only navigable** — every feature reachable without a mouse
- 📢 **`aria-live` announcements** — state changes announced to assistive tech
- 🎭 **Reduced motion** — respects `prefers-reduced-motion`
- 🌗 **Theme contrast** — both light and dark themes pass AA contrast ratios

---

## 🛠️ Tech Stack

<table>
  <tr>
    <td align="center" width="140"><strong>🖥️ Frontend</strong></td>
    <td>
      <img src="https://img.shields.io/badge/SolidJS-2c4f7c?style=flat-square&logo=solid&logoColor=white" alt="SolidJS" />
      <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
      <img src="https://img.shields.io/badge/Tailwind%20v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind" />
      <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    </td>
  </tr>
  <tr>
    <td align="center"><strong>⚙️ Backend</strong></td>
    <td>
      <img src="https://img.shields.io/badge/Fastify-000000?style=flat-square&logo=fastify&logoColor=white" alt="Fastify" />
      <img src="https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite" />
      <img src="https://img.shields.io/badge/Kysely-FF6B6B?style=flat-square" alt="Kysely" />
      <img src="https://img.shields.io/badge/Zod-3E67B1?style=flat-square" alt="Zod" />
    </td>
  </tr>
  <tr>
    <td align="center"><strong>🧪 Testing</strong></td>
    <td>
      <img src="https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white" alt="Vitest" />
      <img src="https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white" alt="Playwright" />
      <img src="https://img.shields.io/badge/axe--core-663399?style=flat-square" alt="axe-core" />
      <img src="https://img.shields.io/badge/fast--check-FF6347?style=flat-square" alt="fast-check" />
    </td>
  </tr>
  <tr>
    <td align="center"><strong>🚀 Deploy</strong></td>
    <td>
      <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
      <img src="https://img.shields.io/badge/Fly.io-7B36ED?style=flat-square&logo=fly.io&logoColor=white" alt="Fly.io" />
      <img src="https://img.shields.io/badge/GitHub%20Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white" alt="GitHub Actions" />
    </td>
  </tr>
</table>

---

## 📂 Project Structure

```
bmad-todo/
├── 📱 apps/
│   ├── web/                  # SolidJS SPA
│   │   ├── src/
│   │   │   ├── components/   # UI components (App, TaskRow, CaptureLine, etc.)
│   │   │   ├── store/        # Reactive stores (task, focus, theme, undo)
│   │   │   ├── sync/         # Service worker & offline sync engine
│   │   │   ├── styles/       # Tailwind CSS & design tokens
│   │   │   └── lib/          # Utilities (latency tracker, ID generation)
│   │   └── public/           # Static assets & PWA manifest
│   └── api/                  # Fastify REST API
│       └── src/
│           ├── routes/       # /tasks, /health, /admin/reset
│           ├── db/           # Kysely + migrations
│           └── middleware/   # Auth, rate-limit, idempotency
├── 📦 packages/
│   └── shared/               # Zod schemas + TypeScript types
├── 🧪 tests/
│   ├── e2e/                  # Playwright journeys, a11y, visual regression
│   └── perf/                 # Performance benchmarks
├── 🔧 scripts/               # CI helpers (bundle check, anti-feature lint)
├── 🐳 infra/                 # Dockerfile + fly.toml
└── 📖 docs/                  # Anti-features, contributing, screen reader checklist
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20 (see `.nvmrc`)
- **pnpm** (`corepack enable`)

### Setup

```bash
# Clone the repo
git clone https://github.com/mtharrison/bmad-todo.git
cd bmad-todo

# Install dependencies
pnpm install

# Start dev servers (API on :3000, Web on :5173)
pnpm dev
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | 🏃 Start API + web dev servers concurrently |
| `pnpm build` | 📦 Build all workspace packages |
| `pnpm test` | 🧪 Run Vitest unit & property tests |
| `pnpm test:e2e` | 🎭 Run Playwright E2E tests |
| `pnpm typecheck` | 🔍 TypeScript strict mode checks |
| `pnpm lint` | 📏 ESLint (+ `lint:fix` to auto-fix) |
| `pnpm format` | 💅 Prettier check (+ `format:fix` to auto-fix) |

---

## 🔒 CI Pipeline

Every push and PR runs **8 parallel quality gates** — code doesn't merge unless all pass.

```
                    ┌─────────────┐
                    │   PR / Push │
                    └──────┬──────┘
    ┌──────┬───────┬───────┼───────┬──────────┬──────────┬──────────┐
    ▼      ▼       ▼       ▼       ▼          ▼          ▼          ▼
 📏Lint  🔍Type  🧪Unit  🚫Anti  📦Bundle  🎭E2E+A11y  🏎️Latency  🔐Audit
         check        features  budget               budget
```

| Gate | What it checks |
|------|---------------|
| 📏 **Lint** | ESLint + Prettier formatting |
| 🔍 **Typecheck** | TypeScript strict mode |
| 🧪 **Unit & Property** | Vitest + fast-check invariants |
| 🚫 **Anti-Features** | Greps for banned patterns |
| 📦 **Bundle Budget** | ≤ 50KB initial JS, ≤ 150KB total |
| 🎭 **E2E + A11y** | Playwright journeys + axe-core audits |
| 🏎️ **Latency Budget** | p95 interaction benchmarks |
| 🔐 **Audit** | `pnpm audit` for vulnerable dependencies |

---

## 🏗️ Architecture Highlights

**🧩 Reactive State** — SolidJS stores with fine-grained reactivity (no virtual DOM diffing)

**🔀 Two-Cursor Focus** — Separate row-focus and inline-edit-focus cursors for seamless keyboard navigation

**📤 Outbox Sync** — Mutations queue in IndexedDB, replay via service worker on reconnect with idempotency keys

**🎨 Design Tokens** — Consistent spacing, typography, and color via Tailwind v4 theme variables

**🛡️ API Safety** — Rate limiting, JWT auth, Zod validation, error envelope pattern, and request idempotency

**📊 Built-In Profiling** — Dev-mode latency overlay shows live p95 vs budget for every interaction type

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Anti-Feature Contract](docs/ANTI-FEATURES.md) | 🚫 What this app will never do |
| [Contributing Guide](docs/CONTRIBUTING.md) | 🤝 Dev setup & code standards |
| [Screen Reader Checklist](docs/SCREEN-READER-CHECKLIST.md) | 🗣️ Manual VoiceOver verification |

---

## 🤝 Contributing

1. Read the [Anti-Feature Contract](docs/ANTI-FEATURES.md) — PRs violating it will be rejected
2. Follow the [Contributing Guide](docs/CONTRIBUTING.md)
3. All code must pass the full CI pipeline (lint, typecheck, tests, budgets)
4. TypeScript strict mode, named exports only, no `console.log`

---

<p align="center">
  <strong>⚡ Fast by design. Simple by conviction. Accessible by default.</strong>
</p>

<p align="center">
  <sub>Built with 🧡 and an unhealthy obsession with latency budgets.</sub>
</p>
