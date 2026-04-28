# Story 1.10: Annunciator and Failure Feedback Routing

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Sam,
I want to be informed of sync problems through a single subtle indicator -- and never see success confirmations for normal actions,
so that the UI stays quiet and I only notice the dot when something genuinely needs my attention.

## Acceptance Criteria

1. **Given** the app is in normal operating state (`syncState() === "online"`), **Then** the Annunciator is not visible (`display: none`); no status dot, badge, or indicator of any kind is shown; `role="status"` and `aria-live="polite"` remain in the DOM but the element has no visual rendering.

2. **Given** the app has been offline for more than 2 seconds (the `annunciator-store` already implements the 2-second transient threshold from Story 1.9), **When** `syncState()` transitions to `"offline"`, **Then** a single 12px circular dot in `--color-accent` appears fixed-position at `bottom: 24px; right: 24px` of the viewport; the element has `role="status"` and `aria-live="polite"`; hovering or focusing the dot reveals the label "Offline".

3. **Given** a sync conflict is detected (`syncState() === "conflict"`), **Then** the Annunciator dot appears with the same visual treatment; hovering or focusing reveals the label "Sync conflict"; clicking it triggers a recovery action (retry pending writes via `flushOutbox()`).

4. **Given** a storage error occurs (`syncState() === "error"`), **Then** the Annunciator dot appears; hovering or focusing reveals the label "Storage error"; clicking it triggers a recovery action (retry pending writes via `flushOutbox()`).

5. **Given** a momentary network blip resolves within 2 seconds, **Then** the Annunciator never becomes visible (the 2-second transient threshold in `annunciator-store.ts` suppresses brief interruptions -- already implemented in Story 1.9).

6. **Given** connectivity is restored and sync completes successfully, **When** `syncState()` returns to `"online"`, **Then** the Annunciator disappears (returns to `display: none`); no "all clear" announcement or success toast.

7. **Given** any routine user action (add, complete, edit, delete, undo), **Then** no success toast, banner, modal, or animation appears confirming the action. This is already the case from Stories 1.3-1.8; this AC verifies no regression.

8. **And** ALL failure feedback in the app routes through Annunciator; no component renders its own error UI; no per-action error toasts; no modal error dialogs; enforced by codebase grep blocking forbidden patterns (`scripts/check-anti-features.sh` -- already blocks `toast(`, `Snackbar`, `<Modal`, `<Dialog`, etc.).

9. **And** Annunciator never: flashes red, plays sound, animates for decorative purposes, or displays a success state. It uses `--color-accent` (never a status color like red/green), consistent with the anti-feature contract (FR53: no decorative motion).

10. **And** the Annunciator is keyboard-focusable when surfaced (`tabindex="0"`) and participates in the global tab order; focus ring uses the standard `:focus-visible` treatment (2px solid `--color-accent`, 4px offset).

11. **And** under `prefers-reduced-motion: reduce`, no transition runs on the annunciator's appearance/disappearance (uses `--motion-default` which resolves to `0ms`).

12. **And** under `forced-colors: active`, the annunciator dot and label use system color tokens (`CanvasText` for dot border/label, `Canvas` for background where applicable) and remain fully legible.

13. **And** contrast assertion: accent color on paper background meets `>=3:1` ratio for both themes -- already verified in `design-tokens.test.ts` from Story 1.2; verify coverage extends to the annunciator dot surface.

14. **And** existing keyboard, undo, completion, edit, capture, and theme flows from Stories 1.3-1.9 continue to pass unchanged; the Annunciator is purely additive UI.

## Tasks / Subtasks

- [x] **Task 1: Create `<Annunciator>` component** (AC: #1, #2, #3, #4, #6, #9, #10, #11, #12)
  - [x] 1.1 Create `apps/web/src/components/Annunciator.tsx` as a named export (never default export per architecture pattern). Component reads `syncState()` from `annunciator-store` and renders conditionally:
    ```tsx
    import { syncState } from "../store/annunciator-store";
    import { flushOutbox } from "../store/task-store";
    ```
  - [x] 1.2 HTML structure per UX spec (line 918-926):
    ```html
    <div
      class="annunciator"
      role="status"
      aria-live="polite"
      data-state={syncState()}
      tabindex={syncState() === "online" ? undefined : "0"}
      onClick={handleClick}
    >
      <span class="annunciator-dot" />
      <span class="annunciator-label">{label()}</span>
    </div>
    ```
  - [x] 1.3 State-to-label mapping:
    - `"online"` / `"silent"` -> not visible (`display: none` via CSS `[data-state="online"]`)
    - `"offline"` -> label: "Offline"
    - `"conflict"` -> label: "Sync conflict"
    - `"error"` -> label: "Storage error"
  - [x] 1.4 Click handler triggers contextual recovery: call `void flushOutbox()` for all abnormal states. (v1 has no multi-device conflict resolver or file-export UI; all three states trigger the same retry action.)
  - [x] 1.5 Render `tabindex="0"` only when surfaced (when `syncState() !== "online"`) so the annunciator does not create a phantom tab stop when invisible.

- [x] **Task 2: Add Annunciator CSS to globals.css** (AC: #1, #2, #9, #11, #12)
  - [x] 2.1 Add `.annunciator` styles to `apps/web/src/styles/globals.css`:

    ```css
    .annunciator {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 1000;
      outline: 0;
      cursor: pointer;
    }

    .annunciator[data-state="online"] {
      display: none;
    }

    .annunciator:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 4px;
      border-radius: 2px;
    }

    .annunciator-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--color-accent);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-accent) 18%, transparent);
      flex-shrink: 0;
    }

    .annunciator-label {
      font-size: 12px;
      color: var(--color-ink-muted);
      white-space: nowrap;
      clip-path: inset(50%);
      transition: none;
    }

    .annunciator:hover .annunciator-label,
    .annunciator:focus-within .annunciator-label,
    .annunciator:focus-visible .annunciator-label {
      clip-path: none;
    }
    ```

  - [x] 2.2 Add `forced-colors` rule for annunciator inside the existing `@media (forced-colors: active)` block:
    ```css
    .annunciator-dot {
      background: CanvasText;
      box-shadow: none;
      border: 1px solid CanvasText;
    }
    .annunciator-label {
      color: CanvasText;
    }
    ```
  - [x] 2.3 Verify no transitions or animations on the annunciator -- `prefers-reduced-motion` is already handled globally by `--motion-default: 0ms` but the annunciator uses `transition: none` explicitly to ensure zero decorative motion (FR53).

- [x] **Task 3: Wire Annunciator into App.tsx** (AC: #1, #14)
  - [x] 3.1 Import and render `<Annunciator />` inside `<main>` in `App.tsx`, after `<TaskList />` and before or after the theme toggle button. The annunciator is fixed-positioned so DOM order doesn't affect layout, but placing it after the main content is semantically correct for tab order.
  - [x] 3.2 Verify that all existing keyboard handlers, focus management, and theme toggle behavior remain unchanged. The `<Annunciator>` is purely additive.

- [x] **Task 4: Create Annunciator unit tests** (AC: #1, #2, #3, #4, #6, #10)
  - [x] 4.1 Create `apps/web/src/components/Annunciator.test.tsx` with tests:
    - When `syncState` is `"online"`, the annunciator div has `data-state="online"` (CSS hides it via `display: none`).
    - When `syncState` is `"offline"`, the annunciator is visible with label "Offline" revealed on hover/focus.
    - When `syncState` is `"conflict"`, label is "Sync conflict".
    - When `syncState` is `"error"`, label is "Storage error".
    - When `syncState` is not `"online"`, `tabindex="0"` is present; when `"online"`, no `tabindex`.
    - Click on annunciator when surfaced calls `flushOutbox`.
    - `role="status"` and `aria-live="polite"` are always present.
  - [x] 4.2 Use `@solidjs/testing-library` + `vitest` consistent with existing component tests (e.g., `App.test.tsx`). Mock `annunciator-store` and `task-store` as needed.

- [x] **Task 5: Add E2E tests for annunciator behavior** (AC: #2, #5, #6, #7, #8)
  - [x] 5.1 Add annunciator tests to `tests/e2e/j6-offline-reconcile.spec.ts` (or create a dedicated `tests/e2e/annunciator.spec.ts` if the existing file is scoped too narrowly):
    - Simulate offline (via `page.route` to block `/tasks`), wait >2s, verify annunciator dot is visible.
    - Simulate restore, verify annunciator disappears.
    - Verify no success toast or banner appears after any task operation.
    - Verify annunciator label is readable on hover/focus.
  - [x] 5.2 Add annunciator visual-regression snapshot to `tests/e2e/visual-regression.spec.ts` -- state "annunciator-surfaced" at desktop viewport, both themes. The UX spec (UX-DR26) lists this as a required snapshot state.

- [x] **Task 6: Verify anti-feature compliance** (AC: #7, #8, #9)
  - [x] 6.1 Run `bash scripts/check-anti-features.sh` and confirm the annunciator implementation introduces no forbidden patterns.
  - [x] 6.2 Verify no `toast(`, `Snackbar`, `<Modal`, `<Dialog`, `Spinner`, `Skeleton`, `<ErrorBoundary` patterns in any new or modified file.
  - [x] 6.3 Verify annunciator uses `--color-accent` only (never status colors red/green/yellow), consistent with UX spec line 455: "No additional colors."

- [x] **Task 7: Verify existing test suites pass** (AC: #14)
  - [x] 7.1 Run `pnpm test` -- all unit/property tests pass.
  - [x] 7.2 Run `pnpm test:e2e` -- all existing E2E tests pass without regression.
  - [x] 7.3 Run `pnpm lint` and `pnpm typecheck` -- clean.

## Dev Notes

### CRITICAL: Architecture Compliance

**The architecture document (`_bmad-output/planning-artifacts/architecture.md`) is the source of truth.** Key requirements for this story:

1. **Annunciator is one of the 7 locked components** (architecture.md line 285, UX spec line 286/309). It lives at `apps/web/src/components/Annunciator.tsx`. Co-located test at `Annunciator.test.tsx`.
2. **Component is presentation-only** (architecture.md line 414). It reads `syncState()` from `store/annunciator-store` and calls `flushOutbox()` from `store/task-store` on click. It does NOT import from `sync/` directly.
3. **Named export only** -- `export function Annunciator()`, never `export default`. ESLint `no-default-export` rule enforces.
4. **Module boundary**: `components/` -> `store/` is a permitted import direction. Do NOT import from `sync/` in the component.
5. **No new state stores needed** -- `annunciator-store.ts` already exists from Story 1.9 with the `syncState` signal, `setSyncState` mutator, and the 2-second transient threshold for offline state.
6. **No new shared types needed** -- `SyncState` enum (`"online" | "offline" | "conflict" | "error"`) already exists in `packages/shared/src/sw-messages.ts`.

### Existing Infrastructure (DO NOT recreate)

**Already implemented in Story 1.9 -- just consume:**

- `apps/web/src/store/annunciator-store.ts` -- `syncState()` signal, `setSyncState()`, 2-second offline threshold, `_resetForTesting()`.
- `apps/web/src/store/annunciator-store.test.ts` -- unit tests for the store's transient threshold logic.
- `apps/web/src/sync/outbox.ts` -- `drain()`, `enqueueAndDrain()`, `resetBackoff()` functions.
- `apps/web/src/store/task-store.ts` -- `flushOutbox()` function that resets backoff and drains; `reconcileWithServer()`.
- `apps/web/src/sync/sw-bridge.ts` -- SW message subscription/posting.
- `apps/web/src/components/App.tsx` -- already imports `setSyncState` and wires `online`/`offline` event listeners (lines 144-151); already calls `reconcileWithServer()` on mount (line 153).
- `scripts/check-anti-features.sh` -- already blocks `toast(`, `Snackbar`, `<Modal`, `<Dialog`, `Spinner`, `Skeleton`, `<ErrorBoundary`.

### Component Implementation Details

**Annunciator anatomy (UX spec lines 918-926):**

```
<div class="annunciator" role="status" aria-live="polite" data-state="...">
  <span class="annunciator-dot" />
  <span class="annunciator-label">{label}</span>
</div>
```

**State mapping:**
| `syncState()` | `data-state` | Visible | Label | Click action |
|---|---|---|---|---|
| `"online"` | `"online"` | No (`display: none`) | -- | -- |
| `"offline"` | `"offline"` | Yes | "Offline" | `flushOutbox()` |
| `"conflict"` | `"conflict"` | Yes | "Sync conflict" | `flushOutbox()` |
| `"error"` | `"error"` | Yes | "Storage error" | `flushOutbox()` |

**Label reveal pattern:** The label is always present in the DOM for `aria-live` but visually hidden via `clip-path: inset(50%)` at rest. On hover or focus, `clip-path: none` reveals it. This matches the existing checkbox-at-rest pattern from `TaskRow` (architecture's "visually suppressed but semantically present" idiom).

**Dot visual:** 12px circle with a subtle 4px halo using `color-mix(in srgb, var(--color-accent) 18%, transparent)` per UX spec line 936. Verify `color-mix` browser support: Chrome 111+, Firefox 113+, Safari 16.2+ -- within the project's browser support matrix (Safari 16.4+).

**Recovery actions for v1:** All three abnormal states trigger `void flushOutbox()` on click. The UX spec (line 947) describes richer recovery for "Sync conflict" (inline resolver) and "Storage error" (file export), but those are v1 simplifications -- the outbox retry is the only action available. The click handler should still route through `flushOutbox` so the behavior is correct for the offline case and harmlessly retries for the other cases.

**Multiple abnormal states:** The UX spec (line 952) says "Multiple abnormal states resolve to the most-severe single label (storage error > sync conflict > offline)." The current `annunciator-store` holds a single `SyncState` signal, and state transitions are last-write-wins. If a priority system is needed, it would live in `annunciator-store.ts`, but for v1 with a single-device single-user setup, concurrent abnormal states are unlikely. Document this as a known simplification.

### Anti-Feature Contract Compliance

**Forbidden patterns that must NOT appear in any new code:**

- No `toast(`, `Snackbar`, `Toaster`, `Skeleton`, `Spinner`
- No `confirm(`, `alert(`, `<Modal`, `<Dialog`
- No success indicators for routine actions
- No `<ErrorBoundary>` -- all errors route through annunciator
- No decorative motion on the annunciator (FR53)
- No red/green/yellow status colors -- accent color only (UX spec line 455)

**Annunciator-specific anti-patterns:**

- DO NOT add a success state ("Saved!", "Connected!") -- the absence of the dot IS the success state
- DO NOT animate the dot's appearance/disappearance -- presence IS the signal
- DO NOT use red for errors -- `--color-accent` (rust/verdigris) for all states
- DO NOT add sound -- FR52 prohibits default audible notifications

### CSS Architecture Notes

**Placement in globals.css:** Add after the `.theme-toggle` block (around line 243). The annunciator styles follow the same pattern as other components: base styles, `:focus-visible` ring, `forced-colors` override.

**`color-mix()` for the halo:** `color-mix(in srgb, var(--color-accent) 18%, transparent)` -- this is a CSS Color Level 5 feature with excellent support in the target browser matrix. If it causes issues, fallback to `box-shadow: 0 0 0 4px rgba(156, 59, 27, 0.18)` for light theme (but this would need per-theme values).

**No new CSS tokens needed.** The annunciator uses existing tokens: `--color-accent`, `--color-ink-muted`, plus standard spacing values.

### Testing Standards

**Unit tests (`Annunciator.test.tsx`):**

- Use `@solidjs/testing-library` and `vitest` consistent with `App.test.tsx`, `TaskRow.test.tsx`, etc.
- Mock `annunciator-store` to control `syncState` signal for each test case.
- Mock `task-store.flushOutbox` to verify click handler calls it.
- Test `role`, `aria-live`, `data-state`, `tabindex` attributes.
- Test label text for each state.

**E2E tests:**

- Annunciator visibility tests belong in `tests/e2e/` -- either extend `j6-offline-reconcile.spec.ts` or create `annunciator.spec.ts`.
- Visual-regression snapshot of annunciator-surfaced state (UX-DR26 requirement).
- Use `page.route('**/tasks', ...)` to simulate offline for E2E.

**CI gates that must pass:**

- `pnpm lint` -- no forbidden patterns, no import boundary violations
- `pnpm typecheck` -- strict TS, no errors
- `pnpm test` -- all vitest (unit + property) pass
- `bash scripts/check-anti-features.sh` -- clean
- `pnpm test:e2e` -- all Playwright specs pass

### Previous Story Intelligence

**From Story 1.9 (Cross-Session Persistence, status: `review`):**

- The `annunciator-store.ts` was created with the `syncState` signal and the 2-second offline threshold. This story's component is the consumer of that signal.
- `App.tsx` already wires `online`/`offline` browser events to `setSyncState()` (lines 144-151) and calls `reconcileWithServer()` on mount.
- `task-store.ts` already exposes `flushOutbox()` which resets backoff and drains the outbox.
- The sync layer (`outbox.ts`, `api-client.ts`) already emits state changes via `setSyncObserver()` -> `setSyncState()`.
- **Key learning from 1.9:** The scope boundary between store-layer state and visible UI was explicitly maintained. Story 1.9 stops at the `annunciator-store.syncState` signal; this story adds the visible `<Annunciator>` component.

**From Story 1.8 (Theme Toggle):**

- Theme toggle button uses `clip-path: inset(50%)` to hide when not focused/hovered -- exact same pattern the annunciator label uses.
- The `.theme-toggle` is `position: fixed; bottom: 24px; left: 24px;` -- the annunciator is `position: fixed; bottom: 24px; right: 24px;` -- they are on opposite sides, no overlap.
- `onMouseDown={(e) => e.preventDefault()}` on the theme toggle prevents focus theft -- consider applying the same pattern to the annunciator click handler if needed to preserve capture-line stickiness.

**From Story 1.7 (Keyboard Navigation):**

- The `isEditableTarget()` guard in `App.tsx` prevents shortcuts from firing in inputs. The annunciator has no text input; clicking it calls `flushOutbox()` and should not interact with keyboard shortcuts.

### File Structure Requirements

**New files:**

- `apps/web/src/components/Annunciator.tsx` -- the component
- `apps/web/src/components/Annunciator.test.tsx` -- co-located unit tests

**Modified files:**

- `apps/web/src/components/App.tsx` -- add `<Annunciator />` import and render
- `apps/web/src/styles/globals.css` -- add annunciator CSS rules
- `tests/e2e/visual-regression.spec.ts` -- add annunciator-surfaced snapshot
- `tests/e2e/j6-offline-reconcile.spec.ts` (or new `annunciator.spec.ts`) -- add annunciator E2E tests

**No other files should be created or modified.** The annunciator-store, sync layer, and task-store already have all the plumbing from Story 1.9.

### Project Structure Notes

**Alignment with architecture.md directory structure (lines 637-639):**

- `apps/web/src/components/Annunciator.tsx` -- matches the architecture's named file exactly.
- `apps/web/src/components/Annunciator.test.tsx` -- matches the co-located test pattern.
- No new directories created.

**Detected conflicts or variances:**

- UX spec line 501 says "16x16px circular indicator" while line 936 says "12px circle" -- the component spec at line 936 is more specific and more recent in the document flow. **Use 12px.**
- UX spec line 947 describes rich recovery actions (inline conflict resolver, local file-export) but v1 has none of this infrastructure. **v1 uses `flushOutbox()` for all recovery actions** -- this is a known simplification.
- UX spec line 952 describes severity-based priority for multiple abnormal states. The current `annunciator-store` is single-signal (last-write-wins). **v1 simplification: single state signal is sufficient** because concurrent abnormal states are rare in single-device single-user mode.

### References

- Source acceptance criteria: [\_bmad-output/planning-artifacts/epics.md#Story-1.10](../../_bmad-output/planning-artifacts/epics.md) (lines 690-721)
- PRD requirements: FR29 (single fixed-position indicator on abnormal state), FR30 (no success indicators), FR31 (no blocking feedback), FR43 (polite live region), FR53 (no decorative motion)
- Architecture: [\_bmad-output/planning-artifacts/architecture.md](../../_bmad-output/planning-artifacts/architecture.md) -- lines 285 (7-component inventory), 309 (Annunciator in component table), 414-416 (module boundaries: components -> store -> sync), 484-498 (error handling: three layers, single failure surface)
- UX design: [\_bmad-output/planning-artifacts/ux-design-specification.md](../../_bmad-output/planning-artifacts/ux-design-specification.md) -- lines 912-953 (Annunciator component spec), 501 (annunciator placement), 455 (no additional colors), 1112-1114 (annunciator routing rule)
- Existing infrastructure:
  - Annunciator store: `apps/web/src/store/annunciator-store.ts` (syncState signal + 2s threshold)
  - Outbox flush: `apps/web/src/store/task-store.ts:flushOutbox()` (lines 143-156)
  - Online/offline wiring: `apps/web/src/components/App.tsx` (lines 144-153)
  - Anti-feature check: `scripts/check-anti-features.sh`
  - Theme toggle CSS pattern: `apps/web/src/styles/globals.css` (lines 192-243) -- same `clip-path` + `fixed` positioning pattern
- Previous story: [\_bmad-output/implementation-artifacts/1-9-cross-session-persistence-and-offline-first-sync.md](./1-9-cross-session-persistence-and-offline-first-sync.md) (status `review`)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No debug issues encountered. Clean implementation.

### Completion Notes List

- Created `<Annunciator>` component reading `syncState()` from `annunciator-store` with conditional rendering, label mapping, click-to-retry via `flushOutbox()`, and `onMouseDown={preventDefault}` to preserve capture-line focus stickiness.
- Added annunciator CSS to `globals.css`: fixed-position dot at bottom-right, `clip-path` label reveal on hover/focus, `forced-colors` overrides using `CanvasText`/`Canvas` system tokens, `transition: none` enforcing FR53 no-decorative-motion.
- Wired `<Annunciator />` into `App.tsx` after `<TaskList />`, before theme toggle. Purely additive — zero changes to existing keyboard/focus/undo behavior.
- 12 unit tests covering all states (online/offline/conflict/error), label text, tabindex presence, click handler, aria attributes, and return-to-online behavior.
- 5 dedicated E2E tests (annunciator.spec.ts): hidden-when-online, offline-appearance-and-restore, label-on-focus, no-success-toast, accent-color-verification.
- 2 visual-regression snapshots (annunciator-surfaced light + dark themes) added to visual-regression.spec.ts.
- Anti-feature compliance verified: `check-anti-features.sh` passes, no forbidden patterns introduced.
- All 265 unit/property tests pass. All 49 E2E tests pass. Lint and typecheck clean.

### Change Log

- 2026-04-28: Implemented Story 1.10 — Annunciator component, CSS, App wiring, unit tests, E2E tests, visual regression snapshots.

### File List

**New files:**
- `apps/web/src/components/Annunciator.tsx`
- `apps/web/src/components/Annunciator.test.tsx`
- `tests/e2e/annunciator.spec.ts`
- `tests/e2e/visual-regression.spec.ts-snapshots/annunciator-surfaced-light-chromium-darwin.png`
- `tests/e2e/visual-regression.spec.ts-snapshots/annunciator-surfaced-dark-chromium-darwin.png`

**Modified files:**
- `apps/web/src/components/App.tsx` (added Annunciator import and render)
- `apps/web/src/styles/globals.css` (added annunciator CSS rules + forced-colors overrides)
- `tests/e2e/visual-regression.spec.ts` (added 2 annunciator-surfaced snapshot tests)

### Review Findings

- [x] [Review][Decision] forced-colors dot background uses `CanvasText` instead of `Canvas` — dismissed: filled dot is correct UX for forced-colors indicators; "where applicable" qualifier exempts the dot.
- [x] [Review][Patch] `flushOutbox` has no concurrent invocation guard — FIXED: added `flushing` boolean guard with finally cleanup. [task-store.ts:147]
- [x] [Review][Patch] Test fixture retry loop silently proceeds if all 5 reset attempts fail — FIXED: added throw after loop if not clean. [test-fixtures.ts:14]
- [x] [Review][Defer] No E2E tests for conflict/error annunciator states (AC3/AC4) — unit tests cover these states but no integration-level coverage. [annunciator.spec.ts]
- [x] [Review][Defer] No E2E test for 2-second transient suppression (AC5) — covered at store unit level; timing-based E2E is fragile. [annunciator.spec.ts]
- [x] [Review][Defer] `flushOutbox` retry loop can block async for 5s with no progress — fire-and-forget from click handler so UI is not blocked, but consecutive `resetBackoff()` calls may hammer a failing server. [task-store.ts:153-157]
- [x] [Review][Defer] `reconcileWithServer` lock silently drops sync requests during long fetches — rapid network events while reconciling in progress are silently ignored. Design limitation for v1 single-device model. [task-store.ts:179]
