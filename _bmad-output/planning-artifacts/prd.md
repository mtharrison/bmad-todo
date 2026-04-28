---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain-skipped', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
workflowComplete: true
completedAt: '2026-04-27'
releaseMode: 'phased'
inputDocuments:
  - 'docs/Product Requirement Document (PRD) for the Todo App.md'
  - '_bmad-output/brainstorming/brainstorming-session-2026-04-27-1709.md'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 1
classification:
  projectType: web_app
  domain: general
  complexity: low
  projectContext: greenfield
  notes: 'Domain is low-complexity (personal productivity), but engineering discipline is elevated — tested latency budgets, cache-aggressive sync, property-based tests on destructive operations. Treat as greenfield with heightened non-functional rigor.'
workflowType: 'prd'
---

# Product Requirements Document - bmad-todo

**Author:** Matt
**Date:** 2026-04-27

## Executive Summary

**bmad-todo** is a personal, single-user todo web application built around a deliberate thesis: in a category saturated with gamification, nudging, and visual chrome, the strongest differentiator is **dignified absence**. The product manages personal tasks via a small set of CRUD operations, but its character — calm, silent, instant, honest — is the feature.

The target user is a design-literate maker who is fatigued by productivity software that lectures, gamifies, shames, or theatres. The problem being solved is not "I cannot track tasks" — that's already solved a hundred times over — but "every available tool taxes my attention with ceremony I did not ask for." Success means a user can capture, complete, and review tasks at the speed of thought, with the application itself fading into the background of the action.

### What Makes This Special

The product is anchored to three pillars, each of which translates into specific, testable engineering and design commitments:

1. **Shockingly fast.** Tested, numeric latency budgets enforced as engineering discipline: <16ms keystroke→render, <50ms check→strike, <100ms add→appear. Cache-aggressive client over a server-of-truth backend, optimistic-everything, honest sync state — never duplicate, never lose, surface conflict only if real.
2. **Test-first rigor as a feature.** Property-based tests on every destructive operation (completion, deletion, undo). Sync invariants validated under stress. Latency regressions caught by automated tests. A visible debug mode shows live keystroke→render latency to make discipline tangible.
3. **Distinctively designed via restraint.** "Reads like a journal page, not a UI." Single asymmetric column, no section headers, no filter chrome, no checkbox until row is focused. Capture input merged into the top of the list. Hand-textured tick. One intentional non-blue color identity. One typeface, one scale, generous type. Empty state is composed silence — no stock photo, no quote, no fake cheer.

The core insight: the productivity-app genre has spent a decade competing on visible features and emotional manipulation. The audience this product addresses is willing to pay — in attention or in money — for a tool that **refuses** to do those things. Distinctiveness comes from competent restraint.

An explicit anti-feature list is part of the contract: no XP, streaks, or gamification; no leaderboards or social comparison; no usage stats or time tracking against the user; no re-engagement notifications; no onboarding tour or tooltips; no skeleton loaders for local data; no blocking animations on completion; no spinners or "saving…" indicators; no autocomplete that flickers, rewrites mid-keystroke, or guesses; no default sound; no persistent navigation chrome.

## Project Classification

- **Project Type:** Web application (full-stack, browser-based, single-page)
- **Domain:** General — personal productivity / consumer tool. No regulated-industry concerns.
- **Domain Complexity:** Low.
- **Engineering Discipline:** Elevated. The product's value proposition depends on tested latency budgets, cache-aggressive sync correctness, and test-first rigor on destructive operations — non-functional concerns must be treated as load-bearing requirements, not afterthoughts.
- **Project Context:** Greenfield. No existing codebase. An earlier PRD draft and a design brainstorming session exist as input artifacts.

## Success Criteria

### User Success

A user is successful when the product disappears into the action. Specifically:
- **Zero-onboarding fluency.** A first-time user adds, completes, and reviews a task without tour, tooltips, or help text. The UI teaches itself.
- **Capture-at-thought.** From intent to typed character is under one second: focused cursor is always ready; no field to click into; global `cmd+enter` from any tab works.
- **Uninterrupted flow on completion.** Pressing `x` (or clicking the task) marks done with sub-100ms perceived feedback and no blocking animation. The next action is immediately available.
- **Reload returns home, instantly.** After a hard refresh in an established session, tasks paint from cache before any network round-trip — no skeleton, no "loading…". Background reconciliation is silent.
- **Reversibility is real.** Any destructive action — completion, deletion, edit — can be undone, including an hour later in the session, without data loss.
- **Glanceable day.** Active and completed tasks together "read like a journal page" — the user can take in the state of the day in one fixation, without parsing UI chrome.

### Project Success

This is a craft/portfolio project; project (not business) success metrics:
- **The thesis ships, observably.** A screenshot of v1 is recognizable as *not* a generic todo app on first glance, validated by ≥3 outside design-literate reviewers without leading prompts.
- **Latency claims are publicly verifiable.** README states the three latency budgets; CI enforces them as build failures; dev-mode shows live keystroke→render latency.
- **The anti-feature list is observably honored.** Independent inspection confirms zero XP, streaks, leaderboards, nags, stock-photo empty states, blocking animations, "saving…" indicators, mid-keystroke autocomplete, default sounds.
- **Distinctiveness lives at the README level.** The thesis ("the speed of thought, where empty is beautiful, every millisecond on the spec sheet") is how the project introduces itself, not buried in commit history.

### Technical Success

- **Latency budgets enforced in CI.** Regression on any of the three numeric budgets (p95 keystroke→render <16ms, p95 check→strike <50ms, p95 add→appear <100ms) fails the build.
- **Property-based tests on every destructive operation.** Completion, deletion, undo, and edit are covered by generative tests that exercise random sequences and verify invariants.
- **Sync invariant tests under stress.** A 1000-operation randomized workload (including simulated offline and re-connect) passes the "never duplicate, never lose" invariant suite.
- **Real undo is proven by test, not by UI hookup.** Every destructive action has a verified reverse path that restores the exact prior state.
- **Cache-first read path.** Initial render after first visit does not depend on any network call. The app remains functional offline for reads and queues writes for replay on reconnect. The very first visit (empty cache) is the only case where rendering tasks awaits a network response — and in that case the capture line is interactive immediately while tasks fetch in parallel.
- **Visible quality signals.** Dev/debug mode shows live latency. Repository surfaces test count and budget enforcement publicly.

### Measurable Outcomes

| Outcome | Target | Verified by |
|---|---|---|
| p95 keystroke→render | <16ms | CI perf test |
| p95 check→strike | <50ms | CI perf test |
| p95 add→appear | <100ms | CI perf test |
| Destructive ops with reversibility tests | 100% | Coverage report |
| Sync invariant violations under stress (1000 ops) | 0 | Integration test |
| First-time user completes core loop without help text | 100% of test users | Usability check, ≥5 testers |
| External reviewers identify aesthetic as non-generic | ≥3 of 3 unprompted | Outside review |
| Anti-feature list violations in v1 | 0 | Self-audit + outside review |

## Product Scope

### MVP — Minimum Viable Product

Must ship for v1 to be a complete product:

**Functional**
- Single-user, no auth.
- Add task (single-field, plain text, captured on `enter`).
- Complete task (strike-through + dim; stays visible in current session).
- Delete task (with undo).
- Inline edit (click text → cursor; `enter` commits, `esc` cancels).
- Session-long undo for completion, deletion, and edit.
- Persistent storage — tasks survive refresh, browser close, and reopen.
- Cache-first reads — tasks present immediately on every visit after the first.
- Optimistic writes — zero spinners, no "saving…" UI.
- Honest sync state — annunciator-style indicator only when something is wrong (offline / conflict).

**Interaction**
- Keyboard-first: `n` new, `j`/`k` move, `x` check, `u` undo, `enter`/`esc` edit commit/cancel, `cmd+enter` quick-capture from anywhere.
- Newest-first sort. Completed slide down but stay visible.

**Aesthetic**
- Single asymmetric column, no section headers, no filter chrome.
- Capture input merged into top of the list (no separate "+" button).
- No checkbox at rest — appears on focus/hover only.
- Hand-textured tick mark on completion.
- One intentional non-blue color identity.
- Both light and dark themes fully designed (no auto-invert).
- Generous type, single typeface, single scale (≥16px body).
- Empty state: composed silence — single quiet input on generous canvas.

**Quality**
- Latency budgets enforced in CI.
- Property-based tests for all destructive operations.
- Sync invariant tests under stress.
- Dev-mode latency display.

### Growth Features (Post-MVP)

Makes the product competitive:
- Sensible single-suggestion autocomplete from history (stable, no mid-keystroke rewrite, dismissible by ignoring).
- `/` to search/filter, `f` to focus single task.
- User-rebindable shortcuts.
- Long-press / `s` to snooze.
- Recurring tasks via double-check or explicit syntax.
- Cross-device sync (CRDT or similar) with conflict-free guarantees.
- Authentication and multi-device for the same user.
- Settings panel — preferences only, no damage-control toggles.
- Inline timestamp evidence on completed tasks.
- Mobile-tuned interaction (full-row tap target, magnified surface).
- Ambient ageing of stale tasks — uncompleted tasks reduce in visual prominence (opacity, weight, or size) with age, without ever moving, deleting, or notifying. Deferred from MVP because the right ageing curve benefits from real usage data.

### Vision (Future)

Possible v2+, deliberately deferred:
- Spatial canvas mode (positioned tasks rather than a column).
- DAW-style timeline view.
- Tagging or projects (only if it doesn't violate the Quiet Tool thesis).
- Multi-user / shared lists (only if it can be done without ceremony).
- Public API or extensibility.
- Native mobile / desktop apps.

## User Journeys

### Persona — Sam, the Design-Literate Maker

Sam is a senior designer / engineer / writer in their 30s who has tried every todo app — Things, Todoist, TickTick, Notion-as-a-todo, Apple Reminders, plain text files. Each one annoys them within a week: too much chrome, gamification they can't turn off, default sounds at 11pm, "0 tasks ✨" cheeriness when the day is in fact on fire. They have ended up in `vim` + a markdown file more than once. They notice typography. They notice latency. They write opinionated tweets about software they bounced off. They are the kind of person who, the moment they see a UI flicker mid-keystroke, will close the tab and never return.

What Sam wants is a tool that gets out of their way and treats them like an adult. They are not looking for a coach, an accountability partner, or a streak. They are looking for a place to put a thought before the thought escapes, and a place to see what the day looked like.

### Journey 1 — Primary User, Happy Path: "Capture, work, review."

**Opening scene.** Tuesday morning, 8:54am. Sam opens a new browser tab and types `td` — autocomplete completes the URL, page loads. The tasks they wrote yesterday afternoon are already visible — no skeleton, no spinner, no "loading…". The cursor is already in the capture line at the top of the list, blinking quietly. Generous whitespace around the column. One typeface. The page reads more like a journal entry than an app.

**Rising action.** Sam types `Reply to Jen about Q3 budget` and presses `enter`. The text instantly drops into the list, occupying the row directly under the input. No animation flourish. No "added!" toast. No microsecond of staleness. They keep typing: `Run the migration on staging`, `Schedule dentist`, `Pick up flowers — anniversary`. Four tasks, four `enter`s, four lines, no friction. Sam has not touched the mouse.

**Climax.** A meeting starts. Sam closes the tab. Twenty minutes later they re-open it. Their four tasks are exactly where they were — the task added last is at the top, the cursor is in the capture line, ready. Sam runs the migration, comes back, presses `j` once to move focus down, presses `x`. The migration line strikes through and dims. The strike happens within a frame; there's no animation that blocks the next press. Sam presses `j` again, presses `x`, the dentist line strikes. Two completions, neither requiring eye contact with the UI.

**Resolution.** End of day. Sam glances at the screen. Active tasks at the top, struck-through completed tasks below — the day reads itself, in a single fixation. Sam closes the tab without ceremony. Tomorrow, the tasks they didn't finish will be exactly where they were. The completed ones from today will still be visible in the session view but settled lower in the page. No nag, no "great job today!", no streak count.

**Capabilities revealed:** persistent cache-first storage; instant initial render; single-field capture with `enter`; keyboard navigation (`j`/`k`/`x`); newest-first ordering; visual completion mark (strike + dim) without blocking animation; in-session retention of completed tasks; no chrome at rest.

### Journey 2 — Primary User, Edge Case: "I just deleted the wrong thing."

**Opening scene.** Sam is moving fast. They press `j` three times to move focus, then go for `x` — but their finger lands on a different key, or they got distracted, and they realize: that wasn't the task I meant to complete. Or worse — they've configured a shortcut for delete and they hit it. The line is gone.

**Rising action.** A flash of "did I just lose something?" The instinct is immediate — `cmd+z`, or in this app's keyboard idiom, `u`.

**Climax.** Sam presses `u`. The deleted (or completed-by-mistake) task reappears, in its original position, with its original text, untouched. No modal asking to confirm the undo. No toast saying "1 item restored." No re-ranking. The cursor is wherever it was. The state is exactly what it was a half-second ago.

**Resolution.** Sam goes back to what they were doing. They are not jolted out of flow. They are not punished. They learned, at sub-second cost, that this app's undo means undo — not "undo the gesture but not the data loss." Trust is built in a half-second. Sam will not hesitate to press destructive keys in the future, because they have proof the safety net is real.

**Capabilities revealed:** session-long undo stack covering completion, deletion, and edit; reversibility verified to restore exact prior state (text, position, completion status); no confirmation modals; no UI ceremony around recovery.

### Journey 3 — Primary User, Returning After Absence: "What was I doing?"

**Opening scene.** Sam was away for four days — a long weekend, no email, no work. Monday morning. They open the app expecting to be nagged. They are not nagged.

**Rising action.** The list is exactly as they left it on Friday. The five tasks they didn't finish are still there. The eight they did complete that week are still visible in the session/day view, struck through. There is no "Welcome back!" banner. There is no "You haven't visited in 4 days, here's a re-engagement nudge." There is no "8 tasks overdue ⚠️". The annunciator corner is silent — nothing is wrong.

**Climax.** Sam reads the page like a journal entry. The five undone items orient them: oh, right, I was going to call my dad. They press `n` to focus the capture line, type `Call dad`, `enter`. The new task lands at the top.

**Resolution.** Re-entry to the system cost zero attention. The tool did not perform concern, did not perform celebration, did not measure their absence against them. It waited, calm. Sam continues their week.

**Capabilities revealed:** no re-engagement nudges; no usage-stats-against-the-user surface; no "overdue" framing on tasks; persistence across long gaps without state degradation; visual continuity (the page from Friday is the page on Monday).

### Journeys Deliberately Not Mapped

For v1, the following user types are explicitly **not** in scope, and so have no journey:

- **Admin / operator.** Single-user, no auth, no multi-tenant model — there is nothing to administer.
- **Support / troubleshooting staff.** No support function exists; the product surfaces its own failures via the annunciator pattern.
- **API consumer / integration developer.** No public API in v1. (May appear in Vision; not in MVP.)
- **Onboarding journey for first-time user.** Deliberately replaced by the "no-tour, UI-teaches-itself" stance. The "first-time user" experience is identical to the returning-user experience: an empty list + capture line. This is a feature, not an oversight.

### Journey Requirements Summary

| Capability area | Required for journey | MVP commitment |
|---|---|---|
| Cache-first persistence with instant render | J1 (open is fast), J3 (Friday → Monday continuity) | Required |
| Single-field, keyboard-driven capture | J1 (four-tasks-no-mouse), J3 (`n` to capture) | Required |
| In-place completion with strike + dim, no blocking animation | J1 (climax: `x` mid-flow) | Required |
| Session-long undo restoring exact prior state | J2 (entire journey) | Required |
| No re-engagement, no nag, no measurement | J3 (entire journey) | Required (anti-feature) |
| In-session retention of completed tasks (visible, dimmed) | J1 (resolution: glanceable day) | Required |
| Annunciator-only error surface | J3 (silent corner) | Required |
| Cursor-always-ready state on open | J1 (opening), J3 (re-entry) | Required |

## Innovation & Novel Patterns

### Detected Innovation Areas

The product is not a breakthrough in the technical-novelty sense — there is no new protocol, no new computational primitive, no WebAssembly trick. The innovation lives at the **interaction and product-positioning layer** and is genuine enough to warrant documentation.

1. **Restraint-as-contract.** Most products differentiate on what they *do*. This product differentiates on what it *refuses to do*, and codifies that refusal as an explicit, testable, anti-feature contract. The anti-feature list (no XP, no streaks, no nags, no chrome, no fake cheer, no time-shame, no leaderboards, no skeleton-for-local-data, no spinners, no mid-keystroke autocomplete, etc.) is a load-bearing product specification — not a stylistic preference.

2. **Latency budgets as a product surface, not a backend KPI.** Numeric perceived-latency commitments (<16ms keystroke→render, <50ms check→strike, <100ms add→appear) are published in the README, enforced in CI, and made visible to the user via a debug/dev mode that displays live keystroke→render latency. Treating performance budgets as a *marketing claim that can be falsified at runtime by the user* is unusual in this category.

3. **Journal-page aesthetic for a productivity tool.** The genre's default visual language — list rows, persistent checkboxes, section headers (Today / Upcoming / Someday), filter chrome, "+" buttons — is not what this product looks like. The page reads as continuous prose: a single asymmetric column, no headers, capture merged into the top of the list, no checkbox until a row is focused. This is a deliberate genre violation, not a minor styling choice.

4. **No-chrome-at-rest as a design principle.** Borrowed from glass-cockpit avionics ("Dark Cockpit philosophy"): UI elements are silent until something is *abnormal* or the user invokes them. No persistent navigation. No always-on settings cog. No checkbox boxes. The list at rest is just text. This is unusual for productivity software.

5. **Honest sync via the annunciator pattern.** Standard practice is optimistic UI plus spinners during reconciliation. This product replaces the spinner with **calm silence on success and a single fixed-position indicator only when something is wrong**. The pattern (also from avionics) is well-established in safety-critical UIs and rare in consumer software.

6. **Hand-textured tick mark.** A small but distinctive interaction-layer move: the completion mark has slight randomness per check — inky, human, not algorithmically clean. Cheap to ship and immediately recognizable in screenshots. The kind of detail that becomes a product's signature.

### Market Context & Competitive Landscape

The personal todo app category is mature, saturated, and aesthetically stagnant. Things 3, Todoist, TickTick, Apple Reminders, Microsoft To Do, Notion-as-a-todo, Bear-as-a-todo, vim-and-a-text-file — the pattern is well-trodden. The novel competitive positions in the last decade have been:

- **Things 3 / Bear / Apple Reminders** — clean defaults, calendar-tinged design.
- **Todoist / TickTick / Habitica** — gamification, streaks, social.
- **Notion / Obsidian** — todos as a side effect of a knowledge-base tool.
- **Linear / Height / Shortcut** — multi-user team task management; not personal-todo.
- **Local-first newcomers (e.g., todos in Tinybase / Replicache / Linear's offline mode)** — local-first as a technical foundation, but rarely as a *user-visible product claim*.

The position this product takes — **personal, single-user, unapologetically restrained, latency-and-trust as marketing surfaces, journal aesthetic** — is genuinely under-occupied. The closest spiritual neighbours are:
- **Bear** (typography-led, restraint-as-character) — but it's a notes app, not a todo, and has standard chrome.
- **Things 3** (reduced ceremony, beautiful empty state) — but it has section headers, persistent checkboxes, and full chrome.
- **vim/text-file todo lists** (the maker's anti-app) — share the no-chrome instinct but lack persistence guarantees, undo, sync, latency discipline.

The wedge: there is no product currently marketing **"productivity software whose differentiator is what it refuses to do, with the speed of thought as a CI-enforced commitment."** That position is open.

### Validation Approach

Each innovation area has a concrete, testable validation path:

- **Restraint-as-contract** — validated by self-audit + ≥3 outside reviewers confirming the anti-feature list is observably honored in v1.
- **Latency budgets as product surface** — validated by CI (build fails on regression) and by the dev-mode latency display (user can verify the claim in real time).
- **Journal-page aesthetic** — validated by ≥3 outside design-literate reviewers identifying v1 as "not a typical todo app" without prompting; reinforced by which Tier-1 SCAMPER moves are present (no checkbox at rest, single column, capture-merged-into-list, no headers).
- **No-chrome-at-rest** — validated by visual-regression test on the empty/at-rest state: the screenshot must not contain navigation chrome, settings affordances, or persistent checkboxes.
- **Annunciator pattern for sync** — validated by integration tests that simulate offline / conflict / online states and assert the indicator surfaces only in abnormal states.
- **Hand-textured tick** — validated by snapshot test that the tick is non-identical across consecutive completions (i.e., the randomness is real).

### Risk Mitigation

| Risk | Likelihood | Mitigation |
|---|---|---|
| Aesthetic perceived as "incomplete" or "broken" by users expecting standard chrome | Medium | Self-selecting audience (Sam persona). The product does not aim for mass-market appeal; the README sets expectations. |
| Anti-feature contract erodes under future PRs | High over time | Anti-features encoded as tests where possible (visual regression on empty state, codebase grep for forbidden strings/patterns, e.g. "🎉", "Streak", "XP"). Anti-feature list lives in the repo, not in the founder's head. |
| Latency budgets unattainable on commodity hosting | Low | Cache-aggressive client means the budgets apply primarily to local operations, which are not network-bound. Sync is async and out of the perceived-latency path. |
| "Reads like a journal" is too subjective to ship against | Medium | Tier-1 SCAMPER moves are *concrete* (no checkbox at rest, single column, no headers, capture merged into list, generous type ≥16px, single typeface). Aesthetic is the sum of those rules; if those rules are satisfied, the aesthetic is delivered. |
| Honest-sync annunciator confuses users (no feedback feels broken) | Medium | Optimistic writes mean state changes appear instantly — the *absence* of feedback is itself confirmation. Annunciator only appears on *failure*, which is the case where feedback genuinely matters. |
| Single-user no-auth limits future paths | Low (deferred risk) | Architecture must not preclude later auth/multi-device (Growth scope). Persistence layer designed with a per-user namespace from day one even though only one user exists. |

## Web Application Specific Requirements

### Project-Type Overview

bmad-todo is a **single-page web application** for personal task management. The **backend is the authoritative source of truth** for todo data; the browser maintains an **aggressive local cache (IndexedDB)** that paints cached cold loads instantly, supports offline reads, queues offline writes for later replay, and reconciles with the server in the background. This thin-client + aggressive-cache shape preserves the latency-budget and "instant-on-open" pillars *for all visits after the first*, while keeping the conventional full-stack architecture from the original PRD draft. Auth and multi-device are not in v1 but the server-of-truth model makes them additive.

### Technical Architecture Considerations

**Application shape — SPA, single-screen.** The app is a single-page application with no client-side routing needed in v1. The entire surface is one screen: list + capture line. Routing can be added later (settings, search results, focused-task view) without architectural change. The journal-page aesthetic and instant-on-open requirement work against page-reload-style navigation; the "no chrome at rest" rule means there is no nav bar to navigate from.

**Server-of-truth + cache-aggressive client.** A small backend API is authoritative for tasks. The browser uses **IndexedDB as a cache and offline-write outbox**, not a primary store. Behavior:
- **First-ever load (empty cache).** App shell renders immediately with the empty state and a focused capture line. Initial fetch starts in parallel; tasks fade in when the fetch resolves. The user can begin typing before the fetch returns.
- **Cached cold load (every subsequent visit).** Paint from cache instantly. Background fetch reconciles any drift from the server. No skeleton, no "loading…", no spinner.
- **Writes.** All mutations apply to cache + visible UI synchronously. Each write enters an outbox queue and is dispatched to the backend asynchronously. UI does not wait on the network.
- **Offline.** Reads work from cache. Writes are queued and replayed on reconnect, in order, with idempotency keys to handle resend safely.
- **Reconciliation.** When a background fetch returns after the user has made local changes, the local outbox is preserved — server-authoritative state is merged with pending local mutations. Conflicts (which require multi-device to actually occur — out of v1 scope) surface via the annunciator pattern only.

**Annunciator pattern for failure surfaces.** A single fixed-position indicator (corner of viewport) surfaces only on failure states: offline, sync conflict, persistence write error. No global error toasts. No success toasts.

**Backend shape (v1).**
- Small REST API: `GET /tasks`, `POST /tasks`, `PATCH /tasks/:id`, `DELETE /tasks/:id`. JSON over HTTPS.
- Stateless server, persistent store (Postgres or SQLite — TBD in architecture phase; favoring SQLite for v1 simplicity).
- **No auth in v1.** The v1 deploy is intended for personal use, not multi-tenant. The data model includes a per-user namespace (single user in v1, but the column / scoping exists) so adding auth in Growth is a deploy/migration concern, not a rewrite.
- Server enforces no business rules beyond CRUD validation and basic rate-limiting. The data shape is intentionally narrow: id, text, completed, created_at, updated_at, deleted_at (soft delete for undo).

### Browser Support Matrix

**Targeted:**

| Browser | Minimum version | Rationale |
|---|---|---|
| Chrome / Chromium-based (Edge, Brave, Arc, Vivaldi) | Last 2 stable | OPFS, IndexedDB, modern CSS (`:has()`, container queries) |
| Safari | 16.4+ | Required for modern persistence APIs and CSS features |
| Firefox | Last 2 stable | Same modern feature set |
| Mobile Safari (iOS) | 16.4+ | Same as desktop Safari |
| Chrome Android | Last 2 stable | Same as desktop Chrome |

**Explicitly not supported:** IE11, legacy Edge, browsers older than ~2 years. The audience (Sam persona) does not use legacy browsers; the latency budgets and persistence guarantees require modern APIs; supporting old browsers would force polyfills that violate bundle-size discipline.

**Browser feature requirements:**
- IndexedDB (required for v1)
- Service Worker (required — backs the cache and offline write outbox; also enables PWA install)
- `prefers-color-scheme`, `prefers-reduced-motion` (required)
- `requestIdleCallback` / `requestAnimationFrame` (for latency-budget instrumentation)
- `Intl.DateTimeFormat` (for any timestamp display)

### Responsive Design

**Approach:** Single layout that adapts via fluid typography and generous whitespace, not breakpoint-defined "mobile / tablet / desktop" variants. The journal-page aesthetic *is* the layout at every viewport — only the column width and spacing scale.

**Specific behavior:**
- **Desktop (≥1024px wide):** Single column, ~640px max-width, centered with generous side margin. Caps at one comfortable line length for prose-density reading.
- **Tablet (640–1024px):** Same column, edge padding scales down proportionally.
- **Mobile (<640px):** Full-width column with comfortable edge padding (≥16px). Tap targets enlarged: full-row tap surface for completion (per SCAMPER M2). Visible chrome remains absent at rest.
- **Touch interactions:** Tap to focus a row; long-press reserved for snooze (Growth). Swipe gestures explicitly **not** in v1 — they conflict with the "no destructive without undo" principle and risk accidental destruction without clear visible confirmation.

**Anti-rule:** No "mobile-only" or "desktop-only" features. The aesthetic is the same everywhere; the affordances scale.

### Performance Targets

Hard, CI-enforced budgets (warm vs. cold made explicit):

| Metric | Budget | Measurement |
|---|---|---|
| p95 keystroke→render in capture line | <16ms | Synthetic perf test in CI |
| p95 check→strike (visible completion mark) | <50ms | Synthetic perf test in CI |
| p95 add→appear (task lands in list after `enter`, warm session) | <100ms | Synthetic perf test in CI |
| Cached cold load: first paint with N=100 tasks visible | <100ms after JS evaluated | Lighthouse |
| First-ever load (empty cache) to interactive on Fast 3G | <2s | Lighthouse |
| Bundle size, initial JS | <50KB gzipped | CI bundle-size check |
| Total bundle (all chunks) | <150KB gzipped | CI bundle-size check |
| Memory under sustained 1000-task workload | <50MB | Stress test |

The "instant on open" claim applies to **every visit after the first**, not the very first cold network load. First-ever load remains explicitly bounded (interactive in <2s on Fast 3G).

**Engineering implications:**
- Framework choice must support the bundle-size and render-budget constraints (likely rules out heavy SPA frameworks; favors solutions like Solid, Svelte, Preact, or a hand-rolled vanilla approach).
- No render-blocking third-party scripts. No analytics in v1 (analytics is also an anti-feature — "no measurement of the user").
- Animations must respect `prefers-reduced-motion` and never block input.

### SEO Strategy

**Not a v1 concern.** The application is a single-user productivity tool. The content (the user's tasks) is private and must never be indexed. No public-facing pages are part of v1.

**Concrete posture:**
- The application root serves a `noindex, nofollow` directive.
- Any future README/marketing/landing page is a separate static site, distinct from the app.
- App structure is JS-rendered; this is acceptable because there is no SEO surface to lose.

### Accessibility Level

**Target: WCAG 2.1 AA, with specific reinforcements driven by the design-distinctive features.** Accessibility is treated as a load-bearing feature, not a checkbox — consistent with "test-first rigor" and the "calm, dignified" character.

**Specific commitments:**

| Concern | Commitment |
|---|---|
| Keyboard-only operation | 100% of MVP functionality reachable via keyboard. Every capability that has a mouse path also has a key. |
| Visible focus indicator | Always present, distinguishable, and *not* color-only. Focus ring designed (not browser default), part of the visual identity. |
| "No checkbox at rest" pattern | Each task row uses correct semantics (likely `role="listitem"` with an inner `role="checkbox"` element that is *visually* hidden at rest but *programmatically* always present). Screen readers must always announce completion state. The visual restraint must not become an a11y regression. |
| Strike-through + dim for completion | Completion state communicated via *both* visual (strike + reduced opacity) *and* aria-state (`aria-checked="true"`). Color/opacity is never the sole signal. |
| Hand-textured tick | Decorative; the underlying state announcement does not depend on the tick visual. |
| Annunciator (sync error indicator) | `aria-live="polite"` region. Announces only on state change to abnormal. |
| Live latency display (dev mode) | Hidden from screen readers (`aria-hidden`); developer affordance only. |
| Color contrast | ≥4.5:1 for body text in both themes. Both themes designed to AA, no auto-inversion. |
| `prefers-reduced-motion` | Honored. The "strike" animation reduces to instant state change; no decorative motion under reduced-motion. |
| Touch target size | ≥44×44px on mobile (full-row tap target satisfies this). |
| Text resizing | Content remains usable up to 200% zoom without horizontal scroll. Generous type baseline (≥16px) makes this easy. |
| Empty state | Composed silence is *visually* sparse, but the capture input is properly labeled (visible label or `aria-label="Add a task"`). Never invisible to assistive tech. |

**Anti-pattern explicitly avoided:** "Cargo-cult dark mode" with insufficient contrast (per the brainstorm flip rule #10). Both themes must pass AA in their own right.

### Implementation Considerations

- **Service worker is required, not optional.** It backs the cache (read-through, network-first-then-cache for `/tasks`), and it handles the offline write outbox via Background Sync API where available, with a foreground replay fallback.
- **Idempotency keys on all mutations.** Required to make the outbox safely re-playable. Server must accept duplicate POST/PATCH with the same key without creating duplicate state.
- **Soft delete on the server** (`deleted_at` column) to support undo across the network boundary. Hard purge can be a periodic backend job.
- **PWA install path.** Manifest + service worker, app installable, opens offline (cached state).
- **No third-party tracking, ads, or analytics in v1.** Consistent with the "no measurement of the user" anti-feature. (If analytics are ever added in Growth, must be explicitly user-opt-in and locally-aggregated.)
- **Theme persistence.** Theme preference persists locally; defaults to `prefers-color-scheme`. Both themes shipped, neither is the "real" one.
- **Dev/debug mode toggle.** A keyboard combo (e.g., `cmd+shift+L`) reveals the live latency display. Hidden by default. Not a user-facing feature; a self-honesty mechanism.
- **Build/deploy.** Static-asset deploy for the SPA (any CDN). Backend is a separate deploy with no shared bundle.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP type: experience-validation MVP, not problem-validation.** The personal-todo problem is fully solved by the existing market — there is no question whether users need a tool to track tasks. What is *not* validated is the underlying thesis of this product: **that the design-literate audience will pay attention to "productivity software whose differentiator is what it refuses to do, with the speed of thought as a CI-enforced commitment."**

The MVP must therefore not be feature-thin in the conventional sense — that would test the wrong question. It must be **character-complete**: every Tier-1 distinctiveness move present (journal aesthetic, no checkbox at rest, capture-merged-into-list, hand-textured tick, latency budgets enforced, real undo proven by test, anti-feature contract observably honored). A reduced MVP that ships "just CRUD and we'll style it later" would not validate anything that matters about this product.

**Validated learning the MVP delivers:**
- Does the journal-page aesthetic read as "not a typical todo app" to outside design-literate reviewers? *(Target: ≥3 of 3 unprompted.)*
- Are the latency claims survivable in real use, on real devices, with real CI? *(Target: zero CI-budget failures across the development period.)*
- Does the anti-feature contract survive a quarter of development without leaking productivity-software defaults? *(Target: zero anti-feature-list violations at v1 ship.)*

**Resource Requirements:**
- **Team size:** Solo (one engineer/designer). The product's restraint thesis is well-suited to a single opinionated builder; design-by-committee actively works against it.
- **Skills required:** Frontend (TypeScript, modern CSS, service workers, IndexedDB, performance instrumentation); backend (a small REST API with persistence — Node/Postgres or Go/SQLite or similar — depth matters less than discipline); test engineering (property-based testing, CI perf budgets, visual regression). All within one person's reach.
- **Estimated MVP duration:** Not estimated here; left for the architecture and execution phases. The scope is small in surface area but deep in finish quality, which historically takes longer than a feature-thin MVP of comparable feature count.

### MVP Feature Set (Phase 1)

The MVP feature list is defined in **Product Scope → MVP — Minimum Viable Product** above and is not restated here. Summary of what's in:

- **Functional:** single-user no-auth; add / complete / delete / inline-edit; session-long undo; persistent storage with cache-aggressive client + server-of-truth backend; optimistic writes; offline reads; outbox-replayed writes; honest sync via annunciator.
- **Interaction:** keyboard-first (`n` / `j` / `k` / `x` / `u` / `enter` / `esc` / `cmd+enter`); newest-first sort; completed visible-but-dimmed.
- **Aesthetic:** single asymmetric column, no headers, no chrome at rest, capture merged into top, hand-textured tick, one non-blue color identity, both themes fully designed, generous type ≥16px.
- **Quality:** CI-enforced latency budgets; property-based tests on destructive operations; sync-invariant stress tests; dev-mode latency display.

**Core user journeys supported by MVP:** Journey 1 (capture / work / review), Journey 2 (delete + undo recovery), Journey 3 (return after absence). All three documented journeys land on MVP scope.

### Post-MVP Features

The Growth and Vision phases are defined in **Product Scope → Growth Features (Post-MVP)** and **Product Scope → Vision (Future)** above and are not restated. Summary of strategic intent:

- **Phase 2 (Growth):** multi-device sync, auth, sensible autocomplete, snooze, recurring tasks, search/focus, rebindable shortcuts, mobile-tuned interaction. *Strategic purpose:* makes the MVP competitive as a daily-driver tool for users beyond Sam-the-archetype.
- **Phase 3 (Vision):** spatial canvas, timeline view, projects/tags, collaboration, public API, native apps. *Strategic purpose:* explores whether the Quiet Tool thesis generalizes beyond a personal todo, or stays defensively in its lane.

### Risk Mitigation Strategy

**Technical risks** *(beyond those already in Innovation → Risk Mitigation):*

| Risk | Mitigation |
|---|---|
| Service worker / IndexedDB / outbox interaction is buggy under real network conditions (offline → online → offline cycles) | Build a deterministic test harness that simulates network state transitions; property-based tests on the outbox replay logic; sync invariants enforced under stress (1000 randomized ops with simulated transitions). |
| Latency budgets unattainable on chosen framework | De-risk early: prototype the capture line + 1000-row list at the beginning of MVP development on candidate framework(s), measure against budgets. If budget cannot be hit, pick a different framework before the rest of the app is built on it. |
| First-ever load to interactive on slow networks blows the <2s budget | Aggressive bundle-size discipline (50KB initial / 150KB total) is the primary defense; CSS-only first paint of the empty state is a fallback to keep the capture line interactive even if JS is still loading. |
| Cache-write-outbox conflict resolution wrong in edge cases (e.g., user completes then deletes the same task while offline) | Outbox treats writes as ordered ops; replays in sequence; idempotency keys server-side; soft-delete server-side preserves recovery. Property-based test for any operation sequence under offline → online transitions. |

**Market / audience risks:**

| Risk | Mitigation |
|---|---|
| Audience too narrow — "design-literate makers" is small | Acceptable risk. This is a portfolio/craft project; broad audience is not a v1 success criterion. |
| Aesthetic perceived as gimmicky rather than principled | Validation gate: ≥3 outside design-literate reviewers identify v1 as non-generic *unprompted*. If unprompted recognition fails, the aesthetic moves were not strong enough and the product needs more divergence, not less. |
| Anti-feature contract is invisible — users don't notice what *isn't* there | Acceptable. The thesis is "dignified absence" — absence is the feature; calling attention to it would betray the thesis. The audience that responds to absence will recognize it; the audience that doesn't is not the target. |

**Resource risks:**

| Risk | Mitigation |
|---|---|
| Solo build stalls on the test/quality discipline (latency CI, property-based tests, visual regression) — these are the slow-to-build parts | Front-load: build the CI perf-budget harness and the property-based test scaffolding *before* writing application code. Discipline that exists from day one is cheap; discipline retrofitted is expensive. |
| Feature creep from the Growth or Vision lists into MVP | Anti-feature list and MVP-vs-Growth split in Product Scope are load-bearing. Re-read this PRD before merging anything that adds surface area. |
| Distraction by polish before correctness | Test discipline orders the work: latency tests, sync invariant tests, undo correctness tests come *before* visual polish. Polish is the last 20%, not a parallel track. |

## Functional Requirements

### Task Capture

- **FR1:** User can add a new task by typing text and pressing a single confirmation key.
- **FR2:** User can begin typing a new task on app open without first focusing or selecting any UI element.
- **FR3:** User can add a new task from anywhere via a global capture shortcut, without first navigating to the application.
- **FR4:** System captures task text exactly as typed; no auto-correction, auto-formatting, or text rewriting is applied.
- **FR5:** System never requires additional metadata (priority, due date, project, tags) at capture time.

### Task Lifecycle

- **FR6:** User can mark an active task as complete via a single keystroke when it has focus, or via a single pointer/touch interaction on its row.
- **FR7:** User can mark a completed task as incomplete via the same gesture.
- **FR8:** User can edit the text of an existing task in-place, without leaving the list view or entering a separate edit mode.
- **FR9:** User can delete a task via a single keystroke or gesture.
- **FR10:** System retains completed tasks in the visible list for the duration of the session; completed tasks are not hidden, archived, or auto-removed.
- **FR11:** System orders tasks newest-first; the most recently added task is at the top.
- **FR12:** User can undo any destructive or state-changing action — completion, completion-reversal, edit, deletion — for the duration of the session.
- **FR13:** System restores undone tasks to their exact prior state, including text, position, and completion status.

### Task Display & Composition

- **FR14:** System presents tasks in a single asymmetric column without section headers, grouping, or filter chrome.
- **FR15:** System displays no checkbox or completion-state UI element on a task row at rest; affordances appear only on focus or hover.
- **FR16:** System distinguishes completed tasks from active tasks via both a visible mark (strike-through and reduced opacity) and a programmatic state attribute consumable by assistive technology.
- **FR17:** System renders the empty state as a single capture line on a generous canvas, without illustration, motivational text, or onboarding content.
- **FR18:** System uses a single typeface and a single type scale across the entire application.
- **FR19:** System uses a generous body-text size (≥16px equivalent).
- **FR20:** System merges the task-capture input into the top of the list, with no separate "add" button or visually distinct input region.

### Persistence & Sync

- **FR21:** System persists tasks across page refresh, browser close-and-reopen, and device restart.
- **FR22:** System renders the user's existing tasks from local cache on every visit after the first, before any network response is required.
- **FR23:** System reconciles local cache with server-authoritative state in the background, after initial paint.
- **FR24:** System applies all user mutations to local state and the visible UI synchronously, without waiting for a network response.
- **FR25:** System queues mutations issued while offline and replays them in order upon reconnection.
- **FR26:** System ensures replayed mutations are idempotent — a duplicate mutation does not produce duplicate state.
- **FR27:** System remains fully operative (read and write) while offline, deferring server reconciliation until reconnection.
- **FR28:** System never displays a skeleton, spinner, or "saving…" indicator for any user-initiated action.

### Reliability Surfaces

- **FR29:** System displays a single fixed-position indicator only when an abnormal state exists (offline, sync conflict, persistence failure).
- **FR30:** System never displays a success indicator (toast, modal, banner) for routine user actions.
- **FR31:** System never blocks the user from issuing the next action while feedback for a prior action is rendering or animating.

### Input & Navigation

- **FR32:** User can navigate between tasks using the keyboard.
- **FR33:** User can perform every MVP operation (add, complete, uncomplete, edit, delete, undo) using the keyboard alone.
- **FR34:** User can perform the same operations via pointer or touch alternatives.
- **FR35:** System never requires modal dialogs for primary task operations; edits and confirmations happen in-place.
- **FR55:** User can press `?` to reveal a keyboard-shortcut overlay that lists every global shortcut and its action; the overlay is dismissed by `Escape` or by pressing `?` again. The trigger key, like other global shortcuts, is gated by the capture-line stickiness rule (`?` typed inside an editable target inserts the character and does NOT open the overlay). The overlay is the only on-screen affordance permitted to teach shortcuts; "Press `?` for help" persistent text on the screen, hover tooltips, and first-time-user walkthroughs remain forbidden (FR46).

### Theming & Accessibility

- **FR36:** System provides both a light theme and a dark theme, each fully designed to the same standard.
- **FR37:** System defaults the active theme to the user's operating-system preference.
- **FR38:** User can override the system theme preference.
- **FR39:** System persists the user's theme override across sessions.
- **FR40:** System satisfies WCAG 2.1 AA color-contrast requirements in both themes.
- **FR41:** System honors the user's reduced-motion preference and removes decorative motion when set.
- **FR42:** System exposes the task list, individual task state, and the capture line to assistive technology with correct semantic roles.
- **FR43:** System surfaces the abnormal-state indicator to assistive technology via a polite live region.

### Quality Self-Honesty

- **FR44:** System provides a hidden developer mode, reachable via a keyboard combination, that displays live keystroke-to-render latency.
- **FR45:** Project repository contains a publicly accessible anti-feature contract document enumerating the behaviors the product refuses to implement.

### Anti-Feature Contract (commitments to observable absence)

- **FR46:** System provides no onboarding tour, tooltip walkthrough, or first-time-user instructional modal.
- **FR47:** System provides no usage statistics, time-tracking metrics, or activity reporting against the user.
- **FR48:** System provides no streak count, achievement points, level progression, or other gamification surface.
- **FR49:** System provides no leaderboard, social sharing, or peer-comparison surface.
- **FR50:** System provides no re-engagement notification, email digest, or absence-based prompt.
- **FR51:** System provides no autocomplete that flickers, rewrites text mid-keystroke, or modifies typed text without explicit user confirmation.
- **FR52:** System produces no audible notification by default.
- **FR53:** All motion in the application communicates state change. The system contains no decorative, ambient, or loading-flourish motion.
- **FR54:** System never reorders or repositions tasks, controls, or affordances based on inferred user behavior, AI ranking, or contextual scoring. Position is determined by deterministic rules (e.g., creation order).

## Non-Functional Requirements

### Performance

- **NFR-Perf-1:** p95 latency from keystroke to rendered character in the capture line: **<16ms**.
- **NFR-Perf-2:** p95 latency from completion gesture to visible strike-through: **<50ms**.
- **NFR-Perf-3:** p95 latency from `enter` to task-appears-in-list (warm session, cached): **<100ms**.
- **NFR-Perf-4:** Cached cold load — first paint with N=100 tasks visible: **<100ms after JS evaluation completes**.
- **NFR-Perf-5:** First-ever load (empty cache) to interactive on Fast 3G simulated network: **<2s**.
- **NFR-Perf-6:** Initial JS bundle **≤50KB gzipped**; total bundle (all chunks) **≤150KB gzipped**.
- **NFR-Perf-7:** Memory footprint under a sustained 1000-task workload: **<50MB**.
- **NFR-Perf-8:** All performance budgets above are enforced in CI; regression on any budget fails the build.
- **NFR-Perf-9:** Latency budgets remain honored under `prefers-reduced-motion`; reduced-motion must not slow perceived response.

### Reliability & Data Integrity

- **NFR-Rel-1:** No task data loss across page refresh, browser close, or device restart, other than tasks the user has explicitly deleted and not undone within the session.
- **NFR-Rel-2:** Sync invariants — *never duplicate, never lose* — hold under a 1000-operation randomized workload including simulated offline/online/conflict transitions. Verified by property-based tests in CI.
- **NFR-Rel-3:** Every destructive operation has a reversibility test that verifies exact-state restoration (text, position, completion status). Coverage of destructive operations by reversibility tests: **100%**.
- **NFR-Rel-4:** Server retains soft-deleted tasks for **≥30 days** to support cross-session recovery edge cases and future undo-beyond-session functionality.
- **NFR-Rel-5:** Idempotency keys on all mutations; server must tolerate **≥10 retries** of the same operation without producing duplicate state.
- **NFR-Rel-6:** Outbox replay order is preserved across reconnect; partial-replay failures do not corrupt the queue.

### Accessibility

- **NFR-A11y-1:** WCAG 2.1 Level AA compliance, verified by automated audit (axe-core or equivalent) running in CI on every PR.
- **NFR-A11y-2:** Color contrast: **≥4.5:1** for body text; **≥3:1** for UI components and meaningful graphical objects, in both light and dark themes.
- **NFR-A11y-3:** **100%** of MVP user-facing functionality reachable via keyboard alone; verified by automated keyboard-only end-to-end test.
- **NFR-A11y-4:** Manual screen-reader verification before v1 ship against **VoiceOver (macOS and iOS)** and **NVDA (Windows)**.
- **NFR-A11y-5:** All interactive controls expose accessible names via the accessibility tree.
- **NFR-A11y-6:** Decorative motion respects `prefers-reduced-motion: reduce`; non-decorative state transitions degrade to instant when the preference is set.
- **NFR-A11y-7:** Touch targets meet **≥44×44px** minimum on mobile viewports.
- **NFR-A11y-8:** Content remains usable up to **200% zoom** without horizontal scroll.

### Privacy

- **NFR-Priv-1:** Task text is user-private data; never logged in plaintext server-side beyond what is required for storage.
- **NFR-Priv-2:** No third-party analytics, tracking pixels, advertising SDKs, or session-replay tooling in v1.
- **NFR-Priv-3:** Application root serves `noindex, nofollow`; task content is never indexable by search engines.
- **NFR-Priv-4:** Server-side data partitioning by per-user namespace from day one, even though only one user exists in v1; cross-user data leakage is prevented by design, not by access-control layer alone.
- **NFR-Priv-5:** All transport over HTTPS; HTTP requests redirected; HSTS header present.

### Security

- **NFR-Sec-1:** All user-supplied text rendered as plain text only; no HTML, script, or markdown is evaluated in v1.
- **NFR-Sec-2:** Backend enforces a maximum task-text length (suggested ≤10,000 characters) to prevent abuse.
- **NFR-Sec-3:** Backend applies basic rate limiting per client/namespace; specifics determined in architecture phase.
- **NFR-Sec-4:** Dependency vulnerability audit runs in CI; high-severity advisories fail the build.
- **NFR-Sec-5:** No credentials, API keys, or secrets in the client bundle. All server secrets injected at deploy time only.
- **NFR-Sec-6:** v1 deploys intentionally without authentication and is intended for personal use only; the deployment must be access-restricted at the network/transport layer (e.g., IP allowlist or VPN), not exposed to the open internet.
- **NFR-Sec-7:** Future auth (Growth) must use industry-standard mechanisms (OAuth/OIDC or signed cookies). Architecture must leave a clean seam for adding auth without rewriting the data model.

### Maintainability

- **NFR-Maint-1:** Property-based tests cover **100%** of destructive operations (add, complete, uncomplete, edit, delete, undo).
- **NFR-Maint-2:** Sync layer covered by a stress-test suite simulating offline/online/conflict transitions; runs in CI.
- **NFR-Maint-3:** Anti-feature regressions detected in CI via:
  - Visual-regression test on the empty/at-rest state (no chrome, no checkbox, no illustration).
  - Codebase lint/grep that fails on forbidden patterns (analytics SDK names, gamification keywords, blocking-animation patterns), with patterns enumerated in the anti-feature contract artifact.
- **NFR-Maint-4:** Anti-feature contract document (FR45) referenced from `CONTRIBUTING.md` or equivalent so contributors encounter it before proposing features.
- **NFR-Maint-5:** Test suite (unit + property + perf + a11y) completes in **<5 minutes** on CI to keep the discipline cheap.

### Scalability

- **NFR-Scale-1:** Not a v1 concern. v1 is a single-user personal deploy. The stateless backend and namespaced data model make horizontal scaling additive in Growth scope; no scale targets are committed for v1.

### Observability

- **NFR-Obs-1:** Latency budgets produce automated pass/fail signal on every PR.
- **NFR-Obs-2:** Live keystroke-to-render latency observable in dev mode (per FR44) for runtime self-honesty validation by both developer and user.
- **NFR-Obs-3:** No production telemetry on user behavior in v1, consistent with the privacy and anti-feature posture.
