# Anti-Feature Contract

These are deliberate product commitments to observable absence — features this product refuses to implement. Their absence is a feature, not a gap.

## Observable Commitments (FR46-54)

| ID   | Commitment                                                                                | Rationale                                                        |
| ---- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| FR46 | No onboarding tour, tooltip walkthrough, or first-time-user instructional modal           | The app must be self-evident; if it needs a tutorial, it's wrong |
| FR47 | No usage statistics, time-tracking metrics, or activity reporting                         | A task list is not a productivity tracker                        |
| FR48 | No streak count, achievement points, level progression, or gamification                   | Productivity tools should not manipulate behavior                |
| FR49 | No leaderboard, social sharing, or peer-comparison surface                                | Tasks are private; comparison is corrosive                       |
| FR50 | No re-engagement notification, email digest, or absence-based prompt                      | The app serves the user, not the other way around                |
| FR51 | No autocomplete that flickers, rewrites text mid-keystroke, or modifies typed text        | The user owns every character; the app is a faithful scribe      |
| FR52 | No audible notification by default                                                        | Sound is an interruption; silence is the default                 |
| FR53 | No decorative, ambient, or loading-flourish motion — all motion communicates state change | Motion budget is reserved for meaningful feedback                |
| FR54 | No reordering based on inferred behavior, AI ranking, or contextual scoring               | The user's order is the correct order                            |

## Forbidden UI Patterns

These implementation-level patterns are banned because they would violate the commitments above:

| Pattern                                       | Violates | Rationale                                          |
| --------------------------------------------- | -------- | -------------------------------------------------- |
| Toasts / Snackbars                            | FR53     | Use annunciator status line instead                |
| Skeleton loaders / Spinners                   | FR53     | App must be fast enough to never need them         |
| Confirmation dialogs (`confirm()`, `alert()`) | FR46     | Undo stack replaces destructive-action gates       |
| Modal dialogs (`<Modal>`, `<Dialog>`)         | FR46     | Inline editing only                                |
| `<ErrorBoundary>`                             | —        | Errors route to annunciator, not silent swallowing |
| Celebration emoji (🎉, ✨, 🏆)                | FR48     | Same as gamification                               |

## Enforcement

- `scripts/check-anti-features.sh` greps for forbidden patterns in CI
- ESLint rules block `no-restricted-syntax` patterns
- Visual regression on empty state catches accidental UI additions
- Code review must reject PRs introducing any listed pattern

## Philosophy

If it needs a loading spinner, it's too slow. If it needs a confirmation dialog, it needs undo instead. If it needs gamification, the core experience isn't compelling enough. If it needs a tutorial, the interface isn't clear enough.
