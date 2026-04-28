# Story 1.11: Dev Mode Latency Display & Anti-Feature Contract

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a hidden in-browser latency display and a published anti-feature contract that makes the product's commitments explicit,
so that performance regressions are immediately visible and the design constraints are a first-class repository artifact.

## Acceptance Criteria

1. **Given** the app is open, **When** the developer presses `Cmd+Shift+L` (Mac) or `Ctrl+Shift+L` (non-Mac), **Then** a DevLatencyDisplay overlay appears showing live p95 keystroke-to-render and completion-gesture-to-strikethrough latency versus their respective budgets (<16ms and <50ms).

2. **Given** DevLatencyDisplay is visible, **When** `Cmd+Shift+L` / `Ctrl+Shift+L` is pressed again, **Then** the overlay is hidden.

3. **Given** DevLatencyDisplay is visible, **When** Sam types in CaptureLine, **Then** the latency display updates in real time with the measured latency.

4. **And** DevLatencyDisplay has `aria-hidden="true"` (developer affordance, not a user feature).

5. **Given** the repository, **When** `docs/ANTI-FEATURES.md` is read, **Then** it explicitly enumerates FR46-54 as observable commitments: no onboarding tour; no usage statistics; no gamification; no leaderboard; no re-engagement notifications; no mid-keystroke autocomplete rewrite; no default audible notification; no decorative/ambient motion; no AI-based task reordering.

6. **And** `README.md` states the three p95 latency budgets (<16ms / <50ms / <100ms) and links to `ANTI-FEATURES.md`.

7. **And** `docs/CONTRIBUTING.md` references `ANTI-FEATURES.md` as required reading before submitting a PR.

## Tasks / Subtasks

- [x] **Task 1: Create latency instrumentation primitives** (AC: #1, #3)
  - [x] 1.1 Create `apps/web/src/lib/latency.ts` — a small module that tracks keystroke-to-render and completion-to-strikethrough timings.
    - Export a `latencyTracker` object with:
      - `recordKeystrokeStart()` — called on `keydown` in CaptureLine; stores `performance.now()`.
      - `recordKeystrokeEnd()` — called after the DOM update; calculates delta, pushes to a rolling window.
      - `recordCompletionStart()` — called when `x` is pressed or row is clicked for toggle.
      - `recordCompletionEnd()` — called after strikethrough renders.
      - `getKeystrokeP95(): number` — returns p95 of the rolling window.
      - `getCompletionP95(): number` — returns p95 of the rolling window.
      - `isActive(): boolean` — whether dev mode is enabled (to avoid measurement overhead when hidden).
      - `setActive(v: boolean)` — toggle.
    - Rolling window: keep last 100 samples. P95 = sorted[Math.floor(count * 0.95)].
    - When `isActive()` is false, `record*` methods are no-ops (zero overhead in production use).
  - [x] 1.2 Create `apps/web/src/lib/latency.test.ts` with unit tests:
    - P95 calculation with known data (e.g., 100 samples of 1-100ms → p95 = 95ms).
    - No-op behavior when inactive.
    - Rolling window evicts oldest samples past 100.

- [x] **Task 2: Create `<DevLatencyDisplay>` component** (AC: #1, #2, #3, #4)
  - [x] 2.1 Create `apps/web/src/components/DevLatencyDisplay.tsx` as a named export. Component reads from `latencyTracker` and updates on a `requestAnimationFrame` loop (or `setInterval(250)` — update ~4x/sec to avoid perf impact from the display itself).
    ```tsx
    export function DevLatencyDisplay();
    ```
  - [x] 2.2 HTML structure:
    ```html
    <div class="dev-latency-display" aria-hidden="true">
      <div class="dev-latency-row">
        <span class="dev-latency-label">Keystroke → render</span>
        <span class="dev-latency-value" data-over-budget="{isOverBudget}"> {keystrokeP95}ms </span>
        <span class="dev-latency-budget">/ 16ms</span>
      </div>
      <div class="dev-latency-row">
        <span class="dev-latency-label">Complete → strike</span>
        <span class="dev-latency-value" data-over-budget="{isOverBudget}"> {completionP95}ms </span>
        <span class="dev-latency-budget">/ 50ms</span>
      </div>
    </div>
    ```
  - [x] 2.3 Value styling: use `--color-ink` for within-budget values, `--color-accent` for over-budget values. No red/green (anti-feature contract: no additional colors). `data-over-budget="true"` attribute toggles the accent color via CSS.
  - [x] 2.4 When dev mode is not active, render nothing (return `null` or `<Show when={...}>`). Use `createSignal<boolean>(false)` for visibility state.
  - [x] 2.5 Create `apps/web/src/components/DevLatencyDisplay.test.tsx`:
    - When dev mode signal is false, component renders nothing.
    - When dev mode signal is true, component renders with `aria-hidden="true"`.
    - Values display correctly when latencyTracker has data.

- [x] **Task 3: Add DevLatencyDisplay CSS to globals.css** (AC: #1)
  - [x] 3.1 Add `.dev-latency-display` styles to `apps/web/src/styles/globals.css` after the annunciator styles:

    ```css
    .dev-latency-display {
      position: fixed;
      top: 24px;
      right: 24px;
      font-size: 11px;
      font-family: ui-monospace, monospace;
      color: var(--color-ink-muted);
      background: var(--color-paper);
      border: 1px solid var(--color-rule);
      border-radius: 4px;
      padding: 8px 12px;
      z-index: 1000;
      pointer-events: none;
      line-height: 1.6;
    }

    .dev-latency-row {
      display: flex;
      gap: 8px;
      align-items: baseline;
    }

    .dev-latency-value {
      font-weight: 600;
      color: var(--color-ink);
      min-width: 48px;
      text-align: right;
    }

    .dev-latency-value[data-over-budget="true"] {
      color: var(--color-accent);
    }

    .dev-latency-budget {
      color: var(--color-ink-muted);
      opacity: 0.6;
    }
    ```

  - [x] 3.2 Under `prefers-reduced-motion: reduce`, no special handling needed (the display has no animations).
  - [x] 3.3 Under `forced-colors: active`, add system color overrides:
    ```css
    .dev-latency-display {
      border-color: CanvasText;
      color: CanvasText;
      background: Canvas;
    }
    .dev-latency-value {
      color: CanvasText;
    }
    .dev-latency-value[data-over-budget="true"] {
      color: Highlight;
    }
    ```

- [x] **Task 4: Wire `Cmd+Shift+L` toggle into App.tsx** (AC: #1, #2)
  - [x] 4.1 In `App.tsx`, add a `createSignal<boolean>(false)` for `devModeVisible`.
  - [x] 4.2 In the `keydown` handler, BEFORE the `isEditableTarget` guard (same pattern as `Cmd+Enter`), add:
    ```ts
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === "L") {
      event.preventDefault();
      setDevModeVisible((v) => !v);
      latencyTracker.setActive(!devModeVisible());
      return;
    }
    ```
    NOTE: This must fire regardless of whether the cursor is in an editable target. The modifier combo `Cmd+Shift+L` does not conflict with normal text editing.
  - [x] 4.3 Render `<DevLatencyDisplay />` inside `<main>`, passing the visibility signal. The component is conditionally rendered — only in DOM when visible.
  - [x] 4.4 Import `latencyTracker` from `../lib/latency` for the toggle handler.

- [x] **Task 5: Wire latency measurement hooks into CaptureLine** (AC: #3)
  - [x] 5.1 In `CaptureLine.tsx`, when dev mode is active, call `latencyTracker.recordKeystrokeStart()` on the `onKeyDown` event of the input.
  - [x] 5.2 After the DOM renders (use `requestAnimationFrame` callback after the event handler), call `latencyTracker.recordKeystrokeEnd()`.
  - [x] 5.3 Keep measurement non-invasive: the CaptureLine is an uncontrolled input (DOM owns text, no per-keystroke re-render). The measurement hooks wrap the existing behavior without changing it.
  - [x] 5.4 Guard all measurement calls with `latencyTracker.isActive()` to ensure zero overhead when dev mode is off.

- [x] **Task 6: Wire completion latency measurement** (AC: #1)
  - [x] 6.1 In `App.tsx` (the `x` key handler) or in `TaskRow.tsx` (the click handler), call `latencyTracker.recordCompletionStart()` before `toggleTaskCompleted()`.
  - [x] 6.2 After the DOM updates (use `requestAnimationFrame`), call `latencyTracker.recordCompletionEnd()`.
  - [x] 6.3 Guard with `latencyTracker.isActive()`.

- [x] **Task 7: Update `docs/ANTI-FEATURES.md`** (AC: #5)
  - [x] 7.1 Rewrite `docs/ANTI-FEATURES.md` to comprehensively enumerate FR46-54 as observable commitments. Structure:
    - Title: "Anti-Feature Contract"
    - Preamble: These are deliberate product commitments to observable absence — features this product refuses to implement.
    - Table with columns: ID | Commitment | Rationale
    - Rows for each FR46-54:
      - FR46: No onboarding tour, tooltip walkthrough, or first-time-user instructional modal
      - FR47: No usage statistics, time-tracking metrics, or activity reporting
      - FR48: No streak count, achievement points, level progression, or gamification
      - FR49: No leaderboard, social sharing, or peer-comparison surface
      - FR50: No re-engagement notification, email digest, or absence-based prompt
      - FR51: No autocomplete that flickers, rewrites text mid-keystroke, or modifies typed text
      - FR52: No audible notification by default
      - FR53: No decorative, ambient, or loading-flourish motion — all motion communicates state change
      - FR54: No reordering based on inferred behavior, AI ranking, or contextual scoring
    - Enforcement section: CI codebase grep, ESLint rules, visual-regression on empty state
    - Philosophy section (keep existing)

- [x] **Task 8: Update `README.md`** (AC: #6)
  - [x] 8.1 Update the latency budgets section to explicitly state all three p95 budgets:
    - p95 keystroke → render: <16ms
    - p95 completion → strikethrough: <50ms
    - p95 enter → task visible: <100ms
  - [x] 8.2 Add a link to `docs/ANTI-FEATURES.md` in the Anti-Features section (link already exists, verify it says the right thing).
  - [x] 8.3 Mention that dev mode (`Cmd+Shift+L`) shows live latency.

- [x] **Task 9: Update `docs/CONTRIBUTING.md`** (AC: #7)
  - [x] 9.1 Verify `docs/CONTRIBUTING.md` references `ANTI-FEATURES.md` as required reading before submitting a PR. (Already present — verify it references the correct expanded content.)

- [x] **Task 10: Verify existing test suites pass** (AC: all)
  - [x] 10.1 Run `pnpm test` — all unit/property tests pass.
  - [x] 10.2 Run `pnpm test:e2e` — all existing E2E tests pass without regression.
  - [x] 10.3 Run `pnpm lint` and `pnpm typecheck` — clean.
  - [x] 10.4 Run `bash scripts/check-anti-features.sh` — no forbidden patterns.

## Dev Notes

### CRITICAL: Architecture Compliance

**The architecture document is the source of truth.** Key requirements for this story:

1. **`DevLatencyDisplay` is one of the 7+1 locked components** (architecture.md line 697). It lives at `apps/web/src/components/DevLatencyDisplay.tsx`. Co-located test at `DevLatencyDisplay.test.tsx`.
2. **Component is presentation-only** (architecture.md line 414). It reads from `latencyTracker` (a `lib/` module). No `sync/` imports.
3. **Named export only** — `export function DevLatencyDisplay()`, never `export default`.
4. **Module boundary**: `components/` → `store/` and `components/` → `lib/` are permitted import directions. `lib/latency.ts` is a pure utility — no store or sync imports.
5. **`lib/latency.ts` is a new file** in `apps/web/src/lib/` alongside the existing `ids.ts` and `tick-path.ts`.
6. **No console.log** in committed code. ESLint `no-console` enforces.
7. **`aria-hidden="true"`** on the DevLatencyDisplay — it is not a user-facing feature (FR44).

### Existing Infrastructure (DO NOT recreate)

**Already implemented — just consume or modify:**

- `apps/web/src/components/App.tsx` — global keyboard handler with `isEditableTarget()` guard. The `Cmd+Shift+L` handler goes BEFORE the guard (same pattern as `Cmd+Enter` on line 45).
- `apps/web/src/components/CaptureLine.tsx` — uncontrolled `<input type="text">`. Has `onKeyDown` handler (line ~30) for Enter key. Add latency measurement hooks here.
- `apps/web/src/components/TaskRow.tsx` — has `handleRowClick()` for completion toggle and `handleRowKeyDown()` for keyboard events. Completion toggle calls `toggleTaskCompleted()` from `task-store`.
- `apps/web/src/store/task-store.ts` — exports `toggleTaskCompleted(id)` which mutates the store.
- `apps/web/src/lib/ids.ts` — existing `lib/` file; naming pattern for new `latency.ts`.
- `apps/web/src/lib/tick-path.ts` — existing `lib/` file.
- `docs/ANTI-FEATURES.md` — exists with basic content, needs expansion to cover FR46-54.
- `docs/CONTRIBUTING.md` — exists with reference to ANTI-FEATURES.md.
- `README.md` — exists with latency budgets section, needs update.

### CaptureLine Keystroke Measurement Strategy

The CaptureLine is an **uncontrolled input** — the DOM owns the typed text, there is no per-keystroke SolidJS re-render. This is the load-bearing tactic for <16ms p95 (NFR-Perf-1).

Measurement approach:

1. In `onKeyDown`, call `latencyTracker.recordKeystrokeStart()` — records `performance.now()`.
2. In a `requestAnimationFrame` callback queued from the same event, call `latencyTracker.recordKeystrokeEnd()` — measures time from keydown to next paint.
3. This captures the true keystroke-to-render latency because `requestAnimationFrame` fires just before the browser paints.

**DO NOT** add a controlled signal for the input value. The uncontrolled pattern is the entire <16ms strategy.

### Completion Latency Measurement Strategy

Completion toggle flows through `toggleTaskCompleted(id)` → `setStore('tasks', ...)` in `task-store.ts`. SolidJS fine-grained reactivity updates only the affected `<TaskRow>`.

Measurement approach:

1. Call `latencyTracker.recordCompletionStart()` before `toggleTaskCompleted()` in the `x` key handler (App.tsx) and in `handleRowClick()` (TaskRow.tsx).
2. Queue a `requestAnimationFrame` that calls `latencyTracker.recordCompletionEnd()` after the strikethrough renders.

### Anti-Feature Contract Content

The existing `docs/ANTI-FEATURES.md` has a basic table but does NOT enumerate FR46-54 individually. The story requires expanding it to explicitly list all 9 anti-feature commitments (FR46-54) with their full descriptions from the PRD.

Current ANTI-FEATURES.md maps to implementation patterns (toast, spinner, etc.), not to the PRD's anti-feature FRs. The expanded version should map both: the observable commitment (what the user would notice is absent) AND the enforcement mechanism.

### Keyboard Shortcut Registration

The `Cmd+Shift+L` handler must be placed in the `keydown` handler in `App.tsx` BEFORE the `isEditableTarget` guard, exactly like `Cmd+Enter`:

```ts
// Cmd+Shift+L toggles dev latency display — works even in editable targets
if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === "L") {
  event.preventDefault();
  // toggle...
  return;
}
```

This ensures the shortcut works while typing in CaptureLine or editing a task.

### CSS Architecture Notes

**Placement in globals.css:** Add after the `.annunciator` block. The DevLatencyDisplay is `position: fixed; top: 24px; right: 24px;` — top-right corner, out of the way of the annunciator (bottom-right) and theme toggle (bottom-left).

**Monospace font exception:** The `font-family: ui-monospace, monospace` on `.dev-latency-display` is the ONLY place in the app that uses a non-Fraunces font. This is acceptable because the display is `aria-hidden="true"` and is a developer affordance, not part of the product's typography (FR18 applies to user-facing text only).

**No additional colors:** Values within budget use `--color-ink`. Values over budget use `--color-accent`. No red/green/yellow. This is consistent with the annunciator's use of `--color-accent` only.

### Anti-Feature Contract Compliance

**Forbidden patterns that must NOT appear in any new code:**

- No `toast(`, `Snackbar`, `Toaster`, `Skeleton`, `Spinner`
- No `confirm(`, `alert(`, `<Modal`, `<Dialog`
- No `<ErrorBoundary>` — errors route to annunciator
- No decorative motion on any new element (FR53)
- No new colors beyond the existing token palette

### Testing Standards

**Unit tests:**

- `latency.test.ts` — P95 calculation, rolling window, inactive no-op.
- `DevLatencyDisplay.test.tsx` — conditional render, `aria-hidden`, value display. Use `@solidjs/testing-library` + `vitest`.

**E2E tests:** Not strictly required for this story. The DevLatencyDisplay is a developer affordance with `aria-hidden="true"`. E2E coverage of the `Cmd+Shift+L` toggle is a nice-to-have but not required by acceptance criteria.

**CI gates that must pass:**

- `pnpm lint` — no forbidden patterns, no import boundary violations
- `pnpm typecheck` — strict TS, no errors
- `pnpm test` — all vitest pass
- `bash scripts/check-anti-features.sh` — clean

### Previous Story Intelligence

**From Story 1.10 (Annunciator, status: `review`):**

- Established the pattern for fixed-position UI elements: annunciator at `bottom: 24px; right: 24px`. DevLatencyDisplay goes at `top: 24px; right: 24px` — they don't overlap.
- `onMouseDown={preventDefault}` on the annunciator prevents focus theft from CaptureLine. DevLatencyDisplay has `pointer-events: none` — no interaction, no focus theft issue.
- Clean implementation with 265 unit tests passing, 49 E2E tests passing.
- `forced-colors` override pattern established: use `CanvasText`, `Canvas`, `Highlight` system tokens.

**From Story 1.9 (Persistence):**

- `task-store.ts` exports: `tasks`, `createTask`, `toggleTaskCompleted`, `editTask`, `deleteTask`, `getTaskById`, `insertTaskAtIndex`, `flushOutbox`, `reconcileWithServer`, `setCompletedAt`.
- Store pattern: `createStore` with fine-grained reactivity.
- Deferred work includes `reconcileWithServer` lock behavior and `flushOutbox` retry loop — not relevant to this story.

**From Story 1.8 (Theme Toggle):**

- `clip-path: inset(50%)` pattern for visually-hidden-but-present elements.
- Theme toggle button is `position: fixed; bottom: 24px; left: 24px`.

### File Structure Requirements

**New files:**

- `apps/web/src/lib/latency.ts` — latency measurement primitives
- `apps/web/src/lib/latency.test.ts` — unit tests
- `apps/web/src/components/DevLatencyDisplay.tsx` — the component
- `apps/web/src/components/DevLatencyDisplay.test.tsx` — co-located unit tests

**Modified files:**

- `apps/web/src/components/App.tsx` — add `Cmd+Shift+L` handler, render `<DevLatencyDisplay />`
- `apps/web/src/components/CaptureLine.tsx` — add keystroke latency measurement hooks
- `apps/web/src/components/TaskRow.tsx` — add completion latency measurement hooks (or wire through App.tsx `x` handler)
- `apps/web/src/styles/globals.css` — add DevLatencyDisplay CSS
- `docs/ANTI-FEATURES.md` — expand to enumerate FR46-54
- `README.md` — update latency budgets section, verify anti-features link
- `docs/CONTRIBUTING.md` — verify reference (likely no changes needed)

### Project Structure Notes

**Alignment with architecture.md directory structure:**

- `apps/web/src/components/DevLatencyDisplay.tsx` — matches the architecture's named file (line 697).
- `apps/web/src/lib/latency.ts` — matches the architecture's named file (line 718).
- No new directories created.

**Detected conflicts or variances:**

- Architecture line 718 lists `latency.ts` as containing "performance.now() instrumentation primitives" — this story implements exactly that.
- The architecture file lists `DevLatencyDisplay.tsx` but not `DevLatencyDisplay.test.tsx` in the tree — the co-located test pattern applies (per architecture testing conventions).
- README.md latency budgets section currently has slightly different wording than the PRD-specified values. This story aligns them to the PRD.

### References

- Source acceptance criteria: [epics.md Story 1.11](../../_bmad-output/planning-artifacts/epics.md) (lines 756-784)
- PRD requirements: FR44 (hidden dev mode, `cmd+shift+L`), FR45 (anti-feature contract document), FR46-54 (anti-feature commitments)
- Architecture: component inventory (line 697 `DevLatencyDisplay.tsx`), lib files (line 718 `latency.ts`), module boundaries (line 414-416), CSS patterns
- UX design: UX-DR16 (`<DevLatencyDisplay>` spec), UX-DR9 (`<App>` owns `cmd+shift+L` handler)
- Existing infrastructure:
  - App keyboard handler: `apps/web/src/components/App.tsx` (lines 37-142)
  - CaptureLine: `apps/web/src/components/CaptureLine.tsx` (uncontrolled input)
  - Task store: `apps/web/src/store/task-store.ts` (`toggleTaskCompleted`)
  - Existing lib files: `apps/web/src/lib/ids.ts`, `apps/web/src/lib/tick-path.ts`
  - Anti-features doc: `docs/ANTI-FEATURES.md`
  - Contributing doc: `docs/CONTRIBUTING.md`
  - Anti-feature check: `scripts/check-anti-features.sh`
- Previous story: [1-10-annunciator-and-failure-feedback-routing.md](./1-10-annunciator-and-failure-feedback-routing.md) (status: `review`)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Fixed sentinel value for latency start timestamps: `0` → `-1` to avoid false no-op when `performance.now()` returns 0 in tests.
- Fixed SolidJS signal timing in toggle: read `devModeVisible()` before `setDevModeVisible()` to avoid inversion.

### Completion Notes List

- Task 1: Created `latency.ts` with rolling-window p95 tracker (100 samples). 10 unit tests covering p95 calculation, no-op when inactive, rolling eviction, deactivation.
- Task 2: Created `DevLatencyDisplay.tsx` with `<Show>` conditional render, `setInterval(250)` polling, `aria-hidden="true"`. 6 component tests.
- Task 3: Added CSS to globals.css — fixed position top-right, monospace font, `data-over-budget` accent styling, forced-colors overrides.
- Task 4: Wired `Cmd+Shift+L` / `Ctrl+Shift+L` toggle into App.tsx before isEditableTarget guard. Exported signal from DevLatencyDisplay module.
- Task 5: Added keystroke latency measurement hooks to CaptureLine using `requestAnimationFrame` for end timing. Guarded with `isActive()`.
- Task 6: Wired completion latency measurement into App.tsx `x` handler, TaskRow `handleCheckboxChange`, and TaskRow `handleRowClick`.
- Task 7: Expanded ANTI-FEATURES.md to enumerate all FR46-54 as observable commitments with rationale. Added forbidden UI patterns table.
- Task 8: Updated README.md with all three p95 budgets and dev mode shortcut mention.
- Task 9: Verified CONTRIBUTING.md already references ANTI-FEATURES.md correctly. No changes needed.
- Task 10: All 281 unit tests pass. 48/49 E2E pass (1 pre-existing flaky test, different test each run). Lint, typecheck, anti-feature check all clean.

### Change Log

- 2026-04-28: Story 1.11 implementation complete. Added DevLatencyDisplay overlay, latency instrumentation, expanded anti-feature contract.

### File List

**New files:**

- apps/web/src/lib/latency.ts
- apps/web/src/lib/latency.test.ts
- apps/web/src/components/DevLatencyDisplay.tsx
- apps/web/src/components/DevLatencyDisplay.test.tsx

**Modified files:**

- apps/web/src/components/App.tsx
- apps/web/src/components/CaptureLine.tsx
- apps/web/src/components/TaskRow.tsx
- apps/web/src/styles/globals.css
- docs/ANTI-FEATURES.md
- README.md

**Unchanged (verified):**

- docs/CONTRIBUTING.md

### Review Findings
