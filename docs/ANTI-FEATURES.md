# Anti-Feature Contract

These patterns are **deliberately excluded** from bmad-todo. Their absence is a feature, not a gap.

## Forbidden UI Patterns (FR46-54)

| ID | Pattern | Rationale |
|---|---|---|
| FR46 | Toasts / Snackbars | Use annunciator status line instead |
| FR47 | Skeleton loaders / Spinners | App must be fast enough to never need them |
| FR48 | Confirmation dialogs (`confirm()`, `alert()`) | Undo stack replaces destructive-action gates |
| FR49 | Modal dialogs (`<Modal>`, `<Dialog>`) | Inline editing only |
| FR50 | Gamification (Streaks, Achievements, XP, Karma) | Productivity tools should not manipulate behavior |
| FR51 | Celebration emoji (🎉, ✨, 🏆) | Same as above |
| FR52 | `<ErrorBoundary>` | Errors route to annunciator, not silent swallowing |

## Enforcement

- `scripts/check-anti-features.sh` greps for forbidden patterns in CI
- ESLint rules block `no-restricted-syntax` patterns (configured per story)
- Code review must reject PRs introducing any listed pattern

## Philosophy

If it needs a loading spinner, it's too slow. If it needs a confirmation dialog, it needs undo instead. If it needs gamification, the core experience isn't compelling enough.
