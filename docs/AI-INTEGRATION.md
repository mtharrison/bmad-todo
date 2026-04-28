# AI Integration Documentation — Epic 1 (Phase 3)

This document logs how AI tooling was used throughout the Epic 1 MVP development of bmad-todo: what worked, what didn't, and where human expertise remained critical.

---

## 1. Agent Usage

### BMAD Framework Orchestration

The entire Epic 1 lifecycle — from product brief through story execution — was orchestrated through the BMAD skill ecosystem (44 installed skills). Key agent roles:

| Agent                            | Role                                                      | Stories Touched              |
| -------------------------------- | --------------------------------------------------------- | ---------------------------- |
| `bmad-agent-pm` (John)           | PRD creation, requirements discovery                      | Pre-sprint planning          |
| `bmad-agent-architect` (Winston) | Architecture decisions (14 ARs), tech stack selection     | Pre-sprint, Story 1-1        |
| `bmad-agent-ux-designer` (Sally) | 7-component inventory, design tokens, accessibility specs | Pre-sprint, Stories 1-2, 1-8 |
| `bmad-agent-dev` (Amelia)        | Story implementation across all 14 stories                | Stories 1-1 through 1-12     |
| `bmad-agent-tech-writer` (Paige) | Documentation, anti-feature contract                      | Story 1-11                   |

### Story Execution Workflow

Each story followed this AI-assisted cycle:

1. **`bmad-create-story`** — Generated story spec files with full context (acceptance criteria, task breakdown, dependencies, test requirements)
2. **`bmad-dev-story`** — Autonomous implementation from story spec, producing commits with atomic task completion
3. **`bmad-code-review`** — Parallel review layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor) with structured triage
4. **`bmad-sprint-status`** — Automated sprint tracking via `sprint-status.yaml`

### Prompts That Worked Best

- **Story specs as self-contained context**: Each story file (`1-1.md` through `1-14.md`) contained everything the dev agent needed — no back-references required. This eliminated ambiguity during autonomous implementation.
- **"Dev this story [file]"**: Simple, direct invocation. The BMAD dev skill reads the spec, plans tasks, executes, and commits atomically.
- **Code review with dismissal authority**: Letting the review agent classify findings as patch/defer/dismiss reduced noise. Stories averaged 30% dismiss rate on review findings (false positives or style-only issues).
- **Architecture decisions as numbered records (AR1–AR14)**: The architect agent produced decisions in a structured format that downstream agents could reference by ID.

### Prompts That Didn't Work Well

- **Vague requests like "make it faster"**: Required human decomposition into specific latency targets before the agent could act.
- **Cross-story dependency reasoning**: Agents couldn't reliably track which deferred items from Story N affected Story N+1 without explicit `deferred-work.md` tracking.

---

## 2. MCP Server Usage

### Context7 (`mcp__plugin_context7_context7`)

**Used for**: Real-time library documentation lookups during implementation.

| Library         | Use Case                                                               | Value                                                                |
| --------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| SolidJS         | Reactive primitives, `createSignal`/`createEffect` patterns, store API | High — SolidJS docs change frequently; training data was often stale |
| Fastify         | Plugin registration, route schemas, error handling                     | Medium — stable API but helpful for edge cases                       |
| Vitest          | Test configuration, mocking patterns, coverage setup                   | Medium                                                               |
| Playwright      | E2E test authoring, locator strategies, axe-core integration           | High — accessibility testing patterns were not well-known            |
| Tailwind v4     | New `@theme` syntax, CSS-first configuration                           | High — v4 was a major breaking change from v3                        |
| Zod             | Schema composition, `.transform()`, `.refine()` patterns               | Low — stable and well-known                                          |
| vite-plugin-pwa | Service worker configuration, Workbox strategies                       | High — niche library with sparse training data                       |

**Key insight**: Context7 was most valuable for newer or niche libraries (SolidJS, Tailwind v4, vite-plugin-pwa) where training data lagged behind releases.

### Chrome DevTools (`mcp__chrome-devtools`)

**Used for**: Browser-based validation during UI implementation.

- **`take_snapshot` + `take_screenshot`**: Verified component rendering, theme switching, responsive layouts
- **`navigate_page` + `click` + `fill`**: Automated golden-path testing of task CRUD flows
- **`list_console_messages`**: Caught runtime warnings and hydration errors during development
- **`lighthouse_audit`**: Accessibility scoring validation (axe-core alignment)
- **`evaluate_script`**: DOM inspection for focus management verification (Story 1-7 keyboard navigation)

**Limitation**: Chrome DevTools MCP couldn't meaningfully test latency budgets (keystroke→render <16ms). Those required dedicated performance instrumentation in the dev overlay (Story 1-11).

---

## 3. Test Generation

### What AI Generated Well

- **Unit tests for pure functions**: Schema validation, data transformations, utility functions — high hit rate with minimal correction needed
- **E2E happy-path scenarios**: Task creation, completion toggle, edit, delete — straightforward user journeys
- **Property-based tests**: The sync engine's 1000-op stress test (offline/online/conflict scenarios) was AI-generated with human-specified invariants
- **Accessibility tests**: axe-core integration tests were generated from the UX spec's WCAG requirements

### Final Test Counts

| Category             | Count            | AI-Generated % (est.)           |
| -------------------- | ---------------- | ------------------------------- |
| Unit tests           | 281              | ~85%                            |
| E2E tests            | 49               | ~70%                            |
| Property-based tests | included in unit | ~60% (invariants human-defined) |

### What AI Missed

- **Edge cases in offline-first sync**: Conflict resolution between IndexedDB and SQLite required human-authored test scenarios for split-brain states
- **Visual regression baselines**: AI could generate the test harness but couldn't judge whether a baseline screenshot was "correct" — required human approval of initial snapshots
- **Timing-sensitive tests**: Debounce behavior, animation completion, and focus trap timing needed manual tuning to avoid flakiness
- **Anti-feature assertion tests**: The concept of testing for the _absence_ of patterns (no toasts, no modals, no spinners) was human-conceived; AI then generated the grep-based assertions

---

## 4. Debugging with AI

### Cases Where AI Excelled

| Issue                                  | How AI Helped                                                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| SolidJS reactivity bugs                | Identified missing `untrack()` calls causing infinite re-render loops                                |
| Focus management in keyboard nav (1-7) | Traced focus loss to SolidJS's `<For>` component recreating DOM nodes; suggested `keyed` approach    |
| Service worker cache invalidation      | Context7 lookup revealed Workbox `cleanupOutdatedCaches()` was needed for PWA version updates        |
| E2E test flakiness                     | Diagnosed race conditions in Playwright waits; recommended `waitForSelector` over fixed `sleep()`    |
| Sync engine causal ordering            | Identified that breaking out of `drain()` loop violated happens-before guarantees (commit `55bd9e3`) |

### Debugging Workflow

The `bmad-code-review` skill's parallel review layers often caught bugs before they reached manual testing:

- **Blind Hunter**: Found security issues (missing input sanitization)
- **Edge Case Hunter**: Found boundary conditions (empty string titles, max-length overflow)
- **Acceptance Auditor**: Verified story acceptance criteria were actually met

---

## 5. Limitations Encountered

### Where Human Expertise Was Critical

| Area                                   | Why AI Fell Short                                                                                                                                                                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Product thesis enforcement**         | AI couldn't internalize "dignified absence" — it repeatedly suggested adding loading spinners, success toasts, and confirmation modals. The anti-feature contract (`ANTI-FEATURES.md`) and grep-based CI enforcement were human-designed guardrails. |
| **Latency budget definition**          | AI had no basis for choosing 16ms vs 50ms vs 100ms thresholds. These came from human knowledge of perceptual psychology and frame budgets.                                                                                                           |
| **Visual design judgment**             | AI generated structurally correct CSS but couldn't assess whether the result _felt_ right. Typography choices (Fraunces for headings), color palette curation, and spacing rhythm required human taste.                                              |
| **Architecture trade-off reasoning**   | AI could enumerate options (SQLite vs Postgres, SolidJS vs React) but couldn't weigh the "single-user personal tool" constraint that made SQLite the obvious choice. Human framing of constraints was essential.                                     |
| **Cross-story deferred work tracking** | AI couldn't maintain a mental model of which test failures were "known deferred" vs "new regressions" across story boundaries. The `deferred-work.md` artifact was a human-designed solution.                                                        |
| **Epic scope decisions**               | Promoting Story 1-14 (keyboard overlay) from Epic 2 to Epic 1 required product judgment about what "character-complete" meant — not a decision AI could make.                                                                                        |
| **Security model design**              | The Cloudflare Access + JWT + single-user architecture was a human decision based on threat modeling for a personal tool. AI suggested overengineered multi-tenant auth patterns.                                                                    |

### Recurring AI Anti-Patterns

1. **Feature creep**: Left unchecked, AI agents added error boundaries, retry logic, and fallback UIs that violated the app's minimalist thesis
2. **Over-abstraction**: AI created helper functions and utility modules for one-off operations
3. **Stale training data**: SolidJS and Tailwind v4 patterns required Context7 lookups almost every time — the agent's built-in knowledge was frequently wrong
4. **Review false positives**: ~30% of code review findings were dismissed as non-issues, suggesting the review agents were too conservative

---

## 6. Metrics Summary

| Metric                                   | Value                                                            |
| ---------------------------------------- | ---------------------------------------------------------------- |
| Stories completed with AI assistance     | 11/14 (all completed stories)                                    |
| Average story cycle time (create → done) | ~2 hours                                                         |
| Code review patches applied vs dismissed | ~60% applied, ~30% dismissed, ~10% deferred                      |
| Test coverage (AI-generated)             | ~80% of total test suite                                         |
| MCP server calls (estimated)             | Context7: ~100+, Chrome DevTools: ~50+                           |
| Human interventions per story (avg)      | 2–3 (scope clarification, visual approval, edge case definition) |

---

## 7. Recommendations for Epic 2

1. **Maintain the anti-feature CI gate** — AI agents will continue to suggest features the product explicitly refuses
2. **Expand Context7 usage** — Any new library adoption should be paired with Context7 lookups from day one
3. **Improve deferred-work tracking** — Consider a structured format that agents can parse automatically across story boundaries
4. **Human-in-the-loop for all UX changes** — The `bmad-checkpoint-preview` skill should be mandatory for any UI-facing story
5. **Tune code review sensitivity** — A 30% dismiss rate suggests review criteria could be refined to reduce noise
