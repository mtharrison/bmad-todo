# Deferred Work

## Deferred from: code review of 1-13-deployment-security-headers-and-production-hardening (2026-04-28)

- SPA fallback `notFoundHandler` prefix list is incomplete/fragile — hardcoded `/tasks`, `/health`, `/admin` won't cover future API routes. Consider adopting a `/api/` prefix convention or inverting the logic to match known SPA routes instead. [apps/api/src/middleware/static.ts:25]
- Dockerfile `sed` rewrite of `packages/shared/package.json` is brittle — hardcoded patterns (`./src/index.ts`, `./src/schema.ts`, `./src/sw-messages.ts`) will silently fail if shared package exports change. Consider a build-time script or separate production `package.json`. [infra/Dockerfile:34]

## Deferred from: code review of 1-12-ci-performance-accessibility-and-visual-regression-gates (2026-04-28)

- P95 with 10 samples is effectively the max — `check-to-strike` uses 10 samples; `Math.floor(10 * 0.95) = 9`, so "P95" is the single worst value. One outlier fails CI. Acceptable for v1 (budgets have wide margin; completion p95 measured at 2.2ms vs 50ms budget).
- Latency tracker is a process-global singleton — module-level mutable arrays/flags could leak between test files if `_reset()` not called. Only used by DevLatencyDisplay (dev mode only), not test-critical.
- Rapid keystrokes drop latency samples due to scalar start timestamp — when two keydown events fire within a single animation frame, `recordKeystrokeStart()` overwrites the previous start. Affects fast typists (>60 WPM) on dev-mode display only, not CI gates.

## Deferred from: code review of 1-10-annunciator-and-failure-feedback-routing (2026-04-28)

- No E2E tests for conflict/error annunciator states (AC3/AC4) — unit tests cover state-to-label mapping and click-to-flush, but no Playwright test exercises conflict or error states at integration level
- No E2E test for 2-second transient suppression (AC5) — store unit tests verify the threshold; timing-based E2E is fragile and prone to flake
- `flushOutbox` retry loop can block async for 5s with no progress detection — sleeps 1s and resets backoff up to 5 times when drain returns stuck entries; UI is not blocked (fire-and-forget), but consecutive `resetBackoff()` calls may hammer a failing server
- `reconcileWithServer` lock silently drops sync requests during long fetches — rapid online events while a reconcile is in progress are silently ignored; design limitation acceptable for v1 single-device single-user model

## Deferred from: code review of 1-9-cross-session-persistence-and-offline-first-sync (2026-04-28)

- Unbounded `idempotency_keys` table growth — no TTL or purge logic; rows accumulate forever; `idx_idem_created` index exists but is never queried; single-user v1 volume is bounded; purge cron is Growth-scope
- Production auth (`auth-jwt.ts`) throws unconditionally in production mode — intentional safety net per spec; Story 1.13 implements Cloudflare Access JWT verification
- `hashRequestBody` uses `JSON.stringify` which is not canonical — key reordering produces different hashes; theoretical for v1 (client always sends same serialization order)
- `createTask` repo uses server `Date.now()` for `updated_at` while `created_at` uses client-supplied timestamp — clock skew could make `updated_at < created_at`; deliberate design choice (server owns mutation timestamp)
- Missing reload-while-offline E2E test per AC#3 — requires production SW shell cache from Story 1.13
- No explicit >=10 retry idempotency test per AC#5 — property test exercises replay indirectly; specific 10-retry scenario is nice-to-have
- `listActive` has no pagination — unbounded result set for GET /tasks; single-user todo app with practical limits; add LIMIT/offset when multi-user or large-scale
- Idempotency race with concurrent same-key requests — read-then-write gap in middleware; theoretical in single-user v1 with SQLite serialization and single-threaded Node.js
- `hydrateFromCache` blocks first render in `index.tsx` — matches spec intent (no empty flash before cached data); IDB read is <10ms for small datasets; risk of white screen on corrupted/slow IDB
- `drain()` uses `break` on backed-off entries, blocking independent entries behind a failed one — safely skipping only independent entries requires per-task-ID dependency tracking; `break` preserves causal ordering at the cost of delayed sync for unrelated mutations

## Deferred from: code review of 1-8-theme-toggle-dark-mode-and-accessibility-tokens (2026-04-28)

- `design-tokens.test.ts` high-contrast contrast tests assert against locally declared hex constants instead of parsing the actual CSS, so a drift in `globals.css` `prefers-contrast: more` values would not be caught — align with the CSS-parsing approach used in the existing AA tests further down the file
- Theme-store / theme-bootstrap module-load safety — `resolveTheme()` reads `window.matchMedia` and `localStorage.getItem` without `typeof window` / try-catch guards; pre-existing from Story 1.2, not in Story 1.8 scope
- `theme-store.ts` does not subscribe to `prefers-color-scheme` change events — runtime OS theme flips do not propagate without an explicit toggle; not required by spec
- Real-browser pointer-focus behavior for `.theme-toggle` not validated — unit tests mix `fireEvent.click()` and `.click()`; pair with the `onMouseDown preventDefault` patch by adding a Playwright assertion that pointer clicks preserve `document.activeElement`

## Deferred from: implementation of 1-8-theme-toggle-dark-mode-and-accessibility-tokens (2026-04-28)

- **`e`-keystroke does not focus the contenteditable span** — Story 1.7 added the global `e` shortcut that calls `setEditingTask(task.id)` from `App.tsx`, but unlike `enterEditMode()` in `TaskRow.tsx` the `App.tsx` path does not focus `textRef`. As a result, `keyboard-only.spec.ts` J5 (Tab → e → Ctrl+A → type → Enter) routes the typed letters back to the global handler — for example the `d` in "almond" deletes the task. Add a `createEffect` in `TaskRow.tsx` (or in `App.tsx` after `setEditingTask`) that focuses `textRef` when editing transitions on. Pre-existing from Story 1.7 — does not block Story 1.8 ACs.
- **`Control+a` in contenteditable not consistently selecting all on macOS Playwright** — `j6-undo-edit.spec.ts` (both subtests) uses literal `Control+a`; the Mac binding is `Meta+a`. Same J5 root cause cascades here. Switch to `ControlOrMeta+A` literal in `j6-*` like `keyboard-only.spec.ts` already does, then re-verify. Pre-existing from Story 1.6 / 1.7.
- **`j1-completion-toggle.spec.ts:46` checkbox click intercepted by row** — the `.task-row` covers the checkbox and Playwright's `checkbox.click()` retries 58× and times out. Fix is either `force: true` on the click, or `eventually-stable` checkbox geometry once the row is hovered. Pre-existing from Story 1.4 visual-suppress-checkbox idiom.
- **`j4-first-ever-visit.spec.ts` `toBeVisible()` on empty `<ul>`** — Playwright reports an empty `<ul role="list">` as "hidden" because its bounding box is 0×0 in the empty-state. Either assert `toHaveCount(0)` only (drop the `toBeVisible` line) or render a zero-height paragraph spacer. Pre-existing from Story 1.3.

## Deferred from: code review of 1-7-keyboard-navigation-and-two-cursor-focus-model (2026-04-28)

- Multi-step undo position semantics — undoing `d` after intervening `j`/`k`/edits restores at original index, which can surprise users; pattern inherited from Story 1.6
- Roving tabindex lacks `role="listbox"`/`aria-activedescendant` (or `role="option"`/`aria-current`) — screen readers don't announce "row N of M selected"; NFR-A11y-5 enhancement for Story 1.8 a11y audit
- No automated test for focus ring under `forced-colors`/high-contrast mode — AC#7 verification belongs in Story 1.12 visual-regression gate
- Bundle-size NFR6 budget is self-reported with no automated CI gate — Story 1.12 territory
- Default-focused-row Option B creates a phantom Tab target with no `data-focused="true"` indicator until first navigation — semantically surprising for AT; slot with NFR-A11y-5 work in Story 1.8
- No `scrollIntoView` on `j`/`k` navigation; long lists let focus leave the viewport — UX enhancement; current MVP fits in viewport
- Browser-quirk defensives unhandled: AltGr+Enter on European layouts, Numpad arrows via `event.code`, Safari dead-key compose timing, Shadow-DOM editables, bfcache restore before `onMount`, `event.key` undefined — defensive-only with no observed failures in target browser matrix
- `focusCaptureLine`/`Cmd+Enter` clear row focus even when `captureInputRef` is null — leaves no DOM focus; CaptureLine is a permanent fixture in v1, revisit if it ever becomes conditional

## Deferred from: code review of 1-6-session-long-undo-stack (2026-04-28)

- Unbounded undo stack growth — no size cap on `pushUndo`; session-scoped by design so practical concern only at thousands of operations; consider adding a max-entries eviction if memory profiling surfaces issues
- Stale index on undo-insert after intervening create/delete mutations — index-based `insertTaskAtIndex` uses the index captured at delete time; if other tasks are created/deleted before undo, the restored task may land at a slightly wrong position; a neighbor-anchor approach would be more robust but is a design change
- No undo entry for `createTask` — pressing `u` after creating a task undoes a prior unrelated action; explicitly out of scope per AC#1–9 (only complete/uncomplete/edit/delete are undoable); consider adding `delete` as the inverse of `create` in a future story
- No `isComposing` guard on `handleRowKeyDown` in TaskRow — pre-existing from Story 1.5; safe in practice due to `event.target !== event.currentTarget` guard filtering out events from child elements; consistency improvement for Story 1.7's keyboard refactor

## Deferred from: code review of 1-5-task-edit-and-delete (2026-04-28)

- Paste rich HTML in browsers that ignore `contenteditable="plaintext-only"` may store HTML markup as task text — add an `onPaste` handler that strips to `text/plain` for full cross-browser safety

## Deferred from: code review of 1-4 (2026-04-27)

- Row keydown handler does not honor Space/Enter as activation keys — defer to Story 1.7 (keyboard navigation) which lands the full focus + activation model
- `tabindex={0}` on every `<li>` linearizes tab traversal with N tasks — Story 1.7 replaces this with a roving-tabindex pattern (already commented in code)
- Clip-path-hidden checkbox stays in the tab order, producing a phantom focus stop with no visible indicator on some browsers — defer to Story 1.7 / 1.8 a11y audit
- Static `aria-label="Mark complete"` does not switch to `"Mark incomplete"` when the task is completed; screen readers announce "Mark complete, checked" — defer to Story 1.8 a11y audit (spec Task 4.1 prescribes the literal label for 1.4)
- Inline theme bootstrap throws if `window.matchMedia` is unavailable; pre-existing gap from Story 1.2 — add a fallback when target browser matrix expands

## Deferred from: code review of 1-2 + 1-3 (2026-04-27)

- `shamefully-hoist=true` in `apps/web/.npmrc` defeats pnpm strict isolation — pre-existing infra decision from Story 1.2 sandbox compatibility
- `pnpm.overrides` for `resolve` package lacks inline documentation — workaround for sandbox `.gitmodules` copy issue with `resolve@2.0.0-next.6`
- E2E tests (smoke.spec.ts, j4-first-ever-visit.spec.ts) assume desktop viewport for auto-focus assertions — will fail if mobile viewport added to Playwright config
- No maximum task count or text length limit in `task-store.ts` — address when persistence lands in Story 1.9

## Deferred from: code review of 1-1-repository-scaffold-and-ci-foundation (2026-04-27)

- Vite proxy target hardcoded to localhost:3000 — environment-configurable proxy is future work; acceptable for scaffold
- TaskSchema missing updatedAt/order fields — schema design decisions for later stories
- GET /health has no dependency checks — appropriate scope for scaffold story; address when real dependencies exist
