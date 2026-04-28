# Story 1.4: Task Completion, Visual State & Tick Component

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Sam,
I want to mark a task done with a single keypress or tap and see it visually acknowledged without any spinner or confirmation dialog,
so that completing tasks feels instant and unobtrusive.

## Acceptance Criteria

1. **Given** a `<TaskRow>` has list focus, **When** Sam presses `x` (or `X`), **Then** the task toggles between active and completed states.

2. **Given** a `<TaskRow>` is visible, **When** Sam clicks or taps the row outside the text region, **Then** the task toggles its completion state.

3. **Given** a task is completed, **Then** it displays strike-through text and reduced opacity (`--color-ink-muted`); `aria-checked="true"` is set on its always-present `<input type="checkbox">`; a `<Tick>` SVG is rendered to the left of the text.

4. **Given** a task is active and at rest (no focus, no hover), **Then** no checkbox or completion affordance is visually perceivable on the row; the checkbox remains in the accessibility tree (hidden via `clip-path: inset(50%)`, never `display: none`); the affordance becomes visible on focus or hover.

5. **Given** any completion toggle occurs, **Then** no spinner, skeleton, "saving…" indicator, success toast, modal, or confirmation prompt appears at any point.

6. **Given** two different tasks are completed, **When** their `<Tick>` components are rendered, **Then** the two SVG `<path d>` strings are not identical (Bezier control-point variance of ±0.4px seeded by task id; same id → same path on re-render and re-completion); both render with `stroke: var(--color-accent)`, `stroke-width: 2.2`, `stroke-linecap: round`, `stroke-linejoin: round`, and `aria-hidden="true"`.

7. **And** completed tasks remain visible in the list for the duration of the session; nothing is hidden, archived, or removed automatically (FR10).

8. **And** clicking the text region of a row is a no-op in this story — it does NOT toggle completion (text-region clicks are reserved for edit mode in Story 1.5; do not wire any edit behaviour here).

9. **And** the `<TaskRow>` exposes `data-completed="true|false"` on the `<li>` so CSS and downstream stories (1.5 edit, 1.7 focus, 1.10 annunciator routing) can target completion state without re-deriving it from props.

10. **And** under `prefers-reduced-motion: reduce`, completion state changes apply within the same frame as the gesture handler with no transition/animation; `--motion-instant` is honoured (NFR9, NFR21).

11. **And** on mobile (<640px container), the `<TaskRow>` tap target meets the ≥44×44px minimum (NFR-A11y-7); tap on row outside the text region toggles completion.

12. **And** state remains in-memory only this story; persistence and outbox queueing land in Story 1.9. The `completedAt` field is added to the local `ActiveTask` shape in preparation for the wire-format `Task` schema in `packages/shared` (finalized in Story 1.9 — do NOT create or modify `packages/shared` here).

## Tasks / Subtasks

- [x] Task 1: Extend `task-store` with completion state and toggle action (AC: #1, #2, #3, #9, #12)
  - [x] 1.1 In `apps/web/src/store/task-store.ts`, extend `ActiveTask` with `completedAt: number | null`. Default new tasks to `completedAt: null` in `createTask`. (Wire-format `Task` from `packages/shared` is finalized in Story 1.9. Naming `completedAt` now — instead of `completed: boolean` — minimizes 1.9 churn; the architecture's wire schema uses `completedAt: z.number().int().nullable()` per `architecture.md` § Pattern Examples.)
  - [x] 1.2 Export `toggleTaskCompleted(id: string): void`. Implementation: `setTasks(t => t.id === id, "completedAt", v => v === null ? Date.now() : null)`. Use Solid's path-form `setStore(filter, key, updater)` — never `.find().completedAt = ...` (architecture § Pattern Examples → Anti-patterns: "direct mutation of store-owned arrays").
  - [x] 1.3 Calling `toggleTaskCompleted` with an id that does not exist must be a no-op (no throw, no array mutation). Solid's path-form filter handles this naturally — confirm with a unit test.
  - [x] 1.4 Do NOT push to an undo stack here; the undo stack lands in Story 1.6. Do NOT enqueue an outbox mutation; the outbox lands in Story 1.9. This story's store is in-memory only.
  - [x] 1.5 Extend `apps/web/src/store/task-store.test.ts`: new task has `completedAt: null`; `toggleTaskCompleted(id)` flips `null` → number on first call; second call flips back to `null`; preserves `text`, `id`, and `createdAt` across toggles; preserves position (index) across toggles; toggling a non-existent id leaves the array unchanged; toggling one task does not affect other tasks' `completedAt`.

- [x] Task 2: Implement deterministic seeded tick-path generator (AC: #6)
  - [x] 2.1 Create `apps/web/src/lib/tick-path.ts` exporting `generateTickPath(seed: string): string`. Inline a tiny deterministic PRNG (e.g., a 32-bit FNV-1a hash of `seed` → seed for a Mulberry32 generator). NO new dependency; the function must be ≤20 lines of TS plus types.
  - [x] 2.2 Canonical tick geometry inside the 14×14 viewBox: corner at (2.5, 7.5), elbow at (6, 11), tip at (12, 3.5). Use a path of the form `M sx sy Q cp1x cp1y, ex ey Q cp2x cp2y, tx ty` where the two `Q` (quadratic) control points are the two jittered control points UX-DR14 specifies. Canonical control points: cp1 ≈ (4, 9.5), cp2 ≈ (9, 7.5). For each invocation, jitter cp1 and cp2 by an independent uniform sample in `[-0.4, +0.4]` on each of x and y — that is the ±0.4 px constraint.
  - [x] 2.3 Seeded determinism contract: `generateTickPath(seed)` MUST return byte-identical strings across calls with the same seed. Use the seed as the PRNG seed; consume four pseudorandom samples (cp1.x, cp1.y, cp2.x, cp2.y) per call.
  - [x] 2.4 Number formatting: round each coordinate to 3 decimal places (`.toFixed(3)`) so the path string is bytewise stable and not subject to floating-point drift across engines. Strip trailing zeros if present.
  - [x] 2.5 Co-located test `apps/web/src/lib/tick-path.test.ts`: `generateTickPath("a") === generateTickPath("a")` (determinism); `generateTickPath("a") !== generateTickPath("b")` (variance per seed); the four control-point coordinates extracted from the path string are each within ±0.4 of the canonical values; the path always begins `M ` and contains exactly two `Q` segments; 1000 randomly seeded calls all yield distinct strings (variance is real — the property assertion behind UX-DR14).

- [x] Task 3: Build the `<Tick>` component (AC: #3, #6)
  - [x] 3.1 Create `apps/web/src/components/Tick.tsx` exporting `Tick(props: { seed: string })`. Render `<svg viewBox="0 0 14 14" class="task-tick" aria-hidden="true"><path d={d} /></svg>` where `d` is computed once via `const d = generateTickPath(props.seed)` at component scope (Solid's component body runs once per instance — not on every render — so this is the cache UX-DR14 specifies. Do NOT wrap in `createMemo`; not needed and adds runtime cost).
  - [x] 3.2 SVG attributes: `width={14}` and `height={14}` are set via CSS on `.task-tick` (do not hardcode in JSX so theming/scale changes flow from tokens). `viewBox="0 0 14 14"` is hardcoded. The `<path>` MUST inherit `stroke`, `stroke-width`, `stroke-linecap`, `stroke-linejoin`, and `fill: none` from CSS — do not set them as JSX attributes (keeps the SVG token-aligned per AR3 strict-token mode).
  - [x] 3.3 Co-located test `apps/web/src/components/Tick.test.tsx`: rendering yields exactly one `<svg>` and one `<path>`; the SVG has `viewBox="0 0 14 14"` and `aria-hidden="true"`; rendering twice with the same seed produces identical `d` attribute strings (component-level determinism); rendering with two different seeds produces different `d` strings; the rendered `<svg>` is the only child (no extra wrappers, no text nodes).

- [x] Task 4: Extend `<TaskRow>` with completion state, checkbox, and tick (AC: #1, #2, #3, #4, #5, #7, #8, #9, #11)
  - [x] 4.1 Update `apps/web/src/components/TaskRow.tsx`. New JSX (preserve `props.task` access — never destructure props in Solid):
    ```tsx
    <li
      class="task-row"
      data-completed={props.task.completedAt !== null ? "true" : "false"}
      tabindex={0}
      role="listitem"
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
    >
      <input
        type="checkbox"
        class="task-checkbox"
        aria-label="Mark complete"
        checked={props.task.completedAt !== null}
        aria-checked={props.task.completedAt !== null}
        onChange={() => toggleTaskCompleted(props.task.id)}
        onClick={(e) => e.stopPropagation()}
      />
      <Show when={props.task.completedAt !== null}>
        <Tick seed={props.task.id} />
      </Show>
      <span class="task-text">{props.task.text}</span>
    </li>
    ```
    Imports needed: `Show` from `solid-js`; `toggleTaskCompleted` from `../store/task-store`; `Tick` from `./Tick`. Module-boundary lint: components → store is allowed (existing rule).
  - [x] 4.2 `handleRowClick(event: MouseEvent)`: if the click target (or any ancestor up to the `<li>`) has class `task-text`, return early (text-region clicks are reserved for Story 1.5 edit). Otherwise call `toggleTaskCompleted(props.task.id)`. Use `(event.target as HTMLElement).closest(".task-text")` for the test — closest is robust against text-node targets and nested spans.
  - [x] 4.3 `handleRowKeyDown(event: KeyboardEvent)`: if `event.key === "x" || event.key === "X"` AND `event.target === event.currentTarget` (the keystroke is on the row itself, not a descendant input/textarea), call `event.preventDefault()` then `toggleTaskCompleted(props.task.id)`. Other keys pass through unchanged. Do NOT match against `event.code` — `KeyX` differs by layout.
  - [x] 4.4 The checkbox's `onChange` handler MUST also dispatch `toggleTaskCompleted`. Stop click propagation on the checkbox itself (`onClick={(e) => e.stopPropagation()}`) so a click on the visible-on-hover checkbox doesn't double-toggle by also bubbling to the row.
  - [x] 4.5 The text MUST remain rendered as plain text via JSX text interpolation only — never `innerHTML`, never `prop:innerHTML` (FR4, NFR-Sec-1). The `<span class="task-text">` wrapper is what enables both the click-target detection and the strike-through CSS.
  - [x] 4.6 Forbidden in this story: any toast / `Snackbar` / `Toaster` / `Skeleton` / `Spinner` / `<Modal` / `<Dialog` / `<ErrorBoundary` / `confirm(` / `alert(` / `🎉` / `✨` / `🏆` / `Streak` / `Achievement` / `XP` / `Karma` (anti-feature grep, AR18). No CSS animation on the strike-through transition (FR53; NFR9 — completion is sub-frame). No `<button>` element wrapping the row — the `<li>` is the click surface (avoiding nested interactives, simpler semantics).
  - [x] 4.7 `tabindex={0}` on every `<li>` is the _minimal_ focus enabling needed for AC#1 in this story. The full roving-tabindex two-cursor focus model lands in Story 1.7. Story 1.7 will replace this `tabindex` with a roving-tabindex pattern (only the focused row is `tabindex=0`; siblings are `tabindex=-1`). Leave a single short comment in the JSX: `// tabindex=0 here; replaced by roving tabindex in Story 1.7`.
  - [x] 4.8 Replace `apps/web/src/components/TaskRow.test.tsx` (the existing assertions that `<input>` and `<svg>` are null are now false and must change). New tests: an active task renders with `data-completed="false"`, exactly one `<input type="checkbox">` (always present), and zero `<svg>` (no tick when not completed); a completed task renders with `data-completed="true"`, exactly one `<input>` with `aria-checked="true"`, and exactly one `<svg>` (the tick); the input's `aria-label` is `"Mark complete"`; clicking the `<li>` outside `.task-text` calls `toggleTaskCompleted` (assert via store state change after render); clicking inside `.task-text` does NOT change completion state; pressing `x` while the `<li>` is focused toggles state; pressing `X` (capital) also toggles; pressing `y` is a no-op; an unrelated descendant keydown (e.g., simulated keydown on the checkbox) does NOT trigger the row's `x` handler (because `event.target !== event.currentTarget`).

- [x] Task 5: CSS for at-rest hidden checkbox, focus/hover reveal, completed strike-through, and ≥44px tap target (AC: #3, #4, #10, #11)
  - [x] 5.1 Append to `apps/web/src/styles/globals.css` AFTER the existing `.task-row` rule. Do NOT modify the existing `@theme`, `:root,[data-theme="light"]`, or `[data-theme="dark"]` blocks — those are validated by 19 unit tests from Story 1.2 and any change there will break those tests. Also do NOT modify `.capture-line`, `.task-list`, the asymmetric column rules, or the existing single-line `.task-row` rule (only extend it).
  - [x] 5.2 Extend `.task-row`:

    ```css
    .task-row {
      padding: 8px 0;
      display: flex;
      align-items: baseline;
      gap: 8px;
      min-height: 44px; /* NFR-A11y-7 mobile tap target */
      cursor: pointer;
      outline: 0;
    }

    .task-row:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 4px;
      border-radius: 2px;
    }

    .task-row[data-completed="true"] .task-text {
      text-decoration: line-through;
      color: var(--color-ink-muted);
    }
    ```

  - [x] 5.3 Add the visually-suppressed checkbox rule (the load-bearing accessible-hidden pattern; clip-path NOT display:none — UX spec line 854):

    ```css
    .task-checkbox {
      flex: 0 0 auto;
      width: 14px;
      height: 14px;
      margin: 0;
      clip-path: inset(50%);
      transition: none;
    }

    .task-row:hover .task-checkbox,
    .task-row:focus-within .task-checkbox,
    .task-row:focus-visible .task-checkbox {
      clip-path: none;
    }

    .task-row[data-completed="true"] .task-checkbox {
      /* completed rows: checkbox stays visible at rest, since the affordance
         (the tick) is the row's most distinctive signal */
      clip-path: none;
    }
    ```

  - [x] 5.4 Add the tick rule:
    ```css
    .task-tick {
      flex: 0 0 auto;
      width: 14px;
      height: 14px;
      stroke: var(--color-accent);
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: none;
    }
    ```
  - [x] 5.5 Reduced-motion: completion is sub-frame and contains no animation/transition by design. The above rules use `transition: none` on the checkbox to ensure no smooth transition appears even if a user agent or future stylesheet adds one. Do NOT add `@media (prefers-reduced-motion: reduce)` overrides for these classes — there is nothing to override (FR53, NFR9).
  - [x] 5.6 Forced-colors / Windows High Contrast: the focus ring uses `outline` (already), the tick uses `stroke` on `<path>` which High Contrast remaps via system colours (acceptable). Do NOT add explicit `forced-colors` overrides in this story; Story 1.8 lands the audit.
  - [x] 5.7 Tokens-only discipline (AR3, strict-token mode): all colour values resolve to project tokens (`--color-accent`, `--color-ink-muted`); the only literal numbers are the spacing scale (4/8/12/14/24/44 px — all on the project scale or required-by-spec dimensions for the 14×14 SVG and 44px tap target). No `bg-*` Tailwind defaults; no raw hex colours in this CSS.

- [x] Task 6: Update existing E2E specs and add new completion-toggle spec (AC: #1, #2, #3, #5)
  - [x] 6.1 Update `tests/e2e/j1-capture-work-review.spec.ts`: the existing `await expect(items.first()).toHaveText("Buy oat milk")` may now match against the row's textContent including the (zero-width) text inside the visually-suppressed checkbox's accessible name. Verify locally that `toHaveText` still passes with the new DOM (the checkbox's `aria-label` is not in `textContent`, and the SVG isn't rendered until the task is completed — so existing assertions should still pass). If they do not, scope to `.task-text` (`page.locator("li .task-text")`) rather than the whole `<li>`. Document the choice in completion notes.
  - [x] 6.2 Update `tests/e2e/visual-regression.spec.ts`: the `imageCount === 0` assertion in the empty-state block remains valid (no tasks → no checkboxes → no SVG). No baseline regeneration is required for the _empty-state_ snapshot. The `blank-light.png` and `blank-dark.png` snapshots also stay byte-identical because the populated DOM diff happens only after a task is added.
  - [x] 6.3 Create `tests/e2e/j1-completion-toggle.spec.ts` (Journey 1, completion-loop subset). Test: goto `/`; type "Walk the dog" + Enter; click the rendered `<li>` outside `.task-text` (e.g., click on the `<input>` or use a small offset from the right edge of the `<li>`); assert the row now has `data-completed="true"` AND `aria-checked="true"` is set on the row's checkbox AND a `<svg>` is now rendered inside the `<li>`. Then click again outside `.task-text`; assert `data-completed="false"` AND `aria-checked="false"` AND no `<svg>` in the row.
  - [x] 6.4 In the same spec, add a keyboard test: type "Buy bread" + Enter; programmatically focus the new `<li>` via `await page.locator("li").first().focus()`; press `x`; assert `data-completed="true"`. Press `X` (capital — `await page.keyboard.press("Shift+KeyX")`); assert `data-completed="false"` (toggled back).
  - [x] 6.5 In the same spec, add an anti-feature regression assertion: after toggling, `await expect(page.locator("text=/saving|loading|saved|done!|nice|great/i")).toHaveCount(0)` AND `await expect(page.locator("[role=alertdialog], [role=dialog]")).toHaveCount(0)`. (FR28, FR30, FR35.)
  - [x] 6.6 If running in a sandbox where Playwright cannot launch a browser (continuing from 1.3 dev notes), mark Task 6 spec runs deferred to CI in completion notes; do NOT silently skip them. The test files MUST still be committed.

- [x] Task 7: Verify all gates and update completion notes (AC: all)
  - [x] 7.1 Run `pnpm typecheck` — passes with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Note: `completedAt: number | null` plays well with `exactOptionalPropertyTypes` because the property is required, not optional.
  - [x] 7.2 Run `pnpm lint` — passes. `import/no-restricted-paths` should remain green (this story imports only `components/` ↔ `store/` and `lib/`).
  - [x] 7.3 Run `bash scripts/check-anti-features.sh` — passes (no `toast(`, `Spinner`, `Skeleton`, `<Modal`, `<Dialog`, `<ErrorBoundary`, etc. introduced).
  - [x] 7.4 Run `pnpm test` — all unit tests pass: existing 48 from 1.3 PLUS new tests in `task-store.test.ts` (≥7 added), `tick-path.test.ts` (≥4 added), `Tick.test.tsx` (≥3 added), and the rewritten `TaskRow.test.tsx` (≥7 added). The pre-existing 19 design-tokens and 7 theme-bootstrap tests MUST continue to pass — they are the regression alarm for the token blocks; if they fail, you've edited something in `globals.css` you shouldn't have.
  - [x] 7.5 Run `pnpm build` — succeeds. Record the bundle size in completion notes. Bundle MUST stay well within the (Story 1.12-enforced) ≤50KB initial / ≤150KB total gzipped budgets. Story 1.3 ended at ~9.4 KB gzip; this story should add only a small delta (~1–2 KB for the tick generator + Tick component + extended TaskRow). Flag in completion notes if either threshold is approached.
  - [x] 7.6 Run `pnpm test:e2e` — Playwright specs pass (smoke + visual-regression + j1 + j4 + j1-completion-toggle). If sandbox cannot launch Playwright (per 1.3 dev notes), mark this step "deferred to CI" in completion notes.

## Dev Notes

### CRITICAL: Architecture vs Epic Naming (carried forward from 1.2 / 1.3)

The architecture document is the source of truth where it disagrees with the epic file:

1. **Framework: SolidJS, NOT React.** Use Solid's JSX (`class=` not `className=`, `onKeyDown`/`onClick`/`onChange`, `ref={el}` callbacks, `onMount`, `createStore`, `createSignal`, `<Show>`/`<For>`). Epic story-text saying "React re-render" should be read as "Solid re-render". `props.task.text` access — NEVER destructure props in Solid (breaks reactivity).
2. **Backend directory: `apps/api`.** Not relevant in this story (no backend work).
3. **Database: SQLite.** Not relevant in this story.

### Phase placement

Story 1.4 is **Phase 4** of the architecture's implementation roadmap (`architecture.md § Decision Impact Analysis → Implementation Sequence` step 3 partial, and UX spec § Implementation Roadmap items 7–8): **`<TaskRow>` focused + completed variants — checkbox-on-focus, completion toggle, strike+dim** and **`<Tick>` — variance generation, accent-stroke rendering**.

Backend wiring, IndexedDB, the outbox, idempotency keys, the service worker, the annunciator, the undo stack, and the full keyboard navigation model are all out-of-scope. The store stays in-memory; tasks vanish on reload. Completion state is a local field (`completedAt: number | null`) on the in-memory `ActiveTask`, named to align with the eventual wire-format `Task` schema (architecture line 549) so Story 1.9 has minimal churn.

### Architecture Compliance (load-bearing rules)

**Module boundaries (frontend) — enforced by `eslint.config.js`'s `import/no-restricted-paths`:**

- `components/` may import from `store/` and `lib/`. May NOT import from `sync/`.
- `store/` may import from `sync/`. May NOT import from `components/`.
- `sync/` may NOT import from `components/` or `store/`.

This story creates files only in `components/`, `store/`, and `lib/`. No `sync/` imports.

**Naming conventions:**

- Components: `PascalCase.tsx` matching the export name. Co-located test: `PascalCase.test.tsx`.
- Non-component modules: `kebab-case.ts`. Co-located test: `kebab-case.test.ts`.
- All exports are NAMED exports (`import/no-default-export` is `error`-level except in framework config files).
- Boolean variables: `isFoo` / `hasFoo` / `canFoo` / `shouldFoo`. (`completedAt: number | null` is intentionally NOT a boolean — it carries the timestamp, which Story 1.9 will need.)

**Tailwind v4 strict-token mode (AR3):**

- All colour, motion values must resolve to a project token (`--color-ink`, `--color-paper`, `--color-accent`, `--color-rule`, `--color-ink-muted`, `--motion-default`, `--motion-instant`).
- Forbidden: `bg-blue-500`, `text-gray-700`, `font-sans`, `font-serif`, `font-mono`, raw hex colours in component CSS, magic motion durations.
- Spacing: literal numbers from the project scale (4/8/12/16/24/32/48/64/96 px) are tokens. The 14 px and 44 px values used in this story are required-by-spec (UX-DR14 tick size; NFR-A11y-7 tap target) — document inline if any reviewer flags.

**Reactivity primitives (Solid, idiomatic):**

- `createStore` for the task list — already used in `task-store.ts`.
- `<Show when={…}>` for the conditional `<Tick>` render — fine-grained, no array iteration overhead.
- The component-body-runs-once-per-instance Solid invariant means computing `const d = generateTickPath(props.seed)` at the top of `<Tick>` already gives you "compute once, cache" without `createMemo`.

**Render strategy for `<TaskRow>` (NFR-Perf-2, <50ms p95 completion-gesture-to-strikethrough):**

- Toggle is a single `setStore` call with the path-form filter. Solid's fine-grained reactivity propagates to: the `<li data-completed>` attribute, the `<input checked/aria-checked>` props, and the `<Show>` wrapper around `<Tick>`. Only the affected row re-renders.
- No transition / animation on the strike-through (FR53 forbids decorative motion; sub-frame state change satisfies NFR-Perf-2).
- No measurement-driven layout work — strike-through is a CSS property, not a layout-affecting style change in any browser.

**Anti-feature contract (FR46–54, AR18; CI-grep enforced via `scripts/check-anti-features.sh`):**

The grep blocks these substrings in `apps/**/*.{ts,tsx,js,jsx}` and `packages/**/*.{ts,tsx,js,jsx}`:

- `toast(`, `Snackbar`, `Toaster`
- `Skeleton`, `Spinner`
- `confirm(`, `alert(`
- `<Modal`, `<Dialog`
- `<ErrorBoundary` (Solid's error boundary; errors must route through annunciator from Story 1.10)
- `Streak`, `Achievement`, `Karma`, `XP` (gamification)
- Emojis: 🎉, ✨, 🏆

If any of these appear in the diff, the lint job fails. Watch for them especially in test names, comments, and console messages. (The word "complete" / "completion" is fine — `Achievement` is the gamification trigger, not "complete".)

### Existing files this story modifies — current state and what must be preserved

**`apps/web/src/store/task-store.ts`** (current state):

```ts
import { createStore } from "solid-js/store";
import { generateId } from "../lib/ids";

export type ActiveTask = {
  id: string;
  text: string;
  createdAt: number;
};

const [tasks, setTasks] = createStore<ActiveTask[]>([]);
export { tasks };

export function createTask(text: string): void {
  if (text.trim().length === 0) return;
  const task: ActiveTask = { id: generateId(), text, createdAt: Date.now() };
  setTasks((prev) => [task, ...prev]);
}

export function clearAllTasks(): void {
  setTasks(() => []);
}
```

What 1.4 changes: extend `ActiveTask` with `completedAt: number | null`; default to `null` in `createTask`; add `toggleTaskCompleted(id)`. Keep `createTask`'s newest-first behaviour, whitespace rejection, and id generation EXACTLY as-is — they are validated by 7 existing tests that must continue to pass.

What must be preserved: the `setTasks((prev) => [task, ...prev])` immutable-prepend (architecture anti-pattern: never `tasks.unshift`). The whitespace early-return. The `clearAllTasks` test util.

**`apps/web/src/components/TaskRow.tsx`** (current state):

```tsx
import type { ActiveTask } from "../store/task-store";

export function TaskRow(props: { task: ActiveTask }) {
  return <li class="task-row">{props.task.text}</li>;
}
```

What 1.4 changes: full extension per Task 4. The signature stays the same (`(props: { task: ActiveTask })`).

What must be preserved: named export; no `default export`; props access via `props.task.*` (no destructure); plain-text rendering of `props.task.text` (no `innerHTML`). The `class="task-row"` continues to be the row's stable hook.

**`apps/web/src/components/TaskRow.test.tsx`** (current state):

```tsx
it("contains no input, svg, or button elements", () => { ... }
```

This test is now WRONG for 1.4 — the row WILL contain an `<input type="checkbox">` always, and a `<svg>` when completed. The test must be REPLACED with the new assertions per Task 4.8 — do not "fix" it by relaxing the assertion; rewrite it to validate the new contract.

**`apps/web/src/styles/globals.css`** (current state — see lines 64–120 in repo): contains `body { container-type }`, the asymmetric `main.app-main` rules at 3 breakpoints, `.capture-line` + focus, `.task-list`, and a single-line `.task-row` rule (`padding: 8px 0`).

What 1.4 changes: extend `.task-row` (do NOT replace), and append new rules for `.task-row:focus-visible`, `.task-row[data-completed="true"] .task-text`, `.task-checkbox`, `.task-tick`. Append to the end of the file.

What must NOT be modified: the `@theme` block, `:root,[data-theme="light"]`, `[data-theme="dark"]`, `@font-face`, `html`, `body`, `main.app-main` rules, `.capture-line`, `.task-list`. The 19 design-tokens + 7 theme-bootstrap tests will fail if you touch any of those.

**`tests/e2e/j1-capture-work-review.spec.ts`** (current state — 4 tests): newest-first ordering; no spinner; Escape clears; whitespace-only Enter no-op.

What 1.4 changes: Task 6.1 verifies these still pass. If `toHaveText("Buy oat milk")` regresses due to the new DOM, scope to `.task-text` — but you should not need to. No new tests added to this file; new completion-toggle tests go into a NEW file `j1-completion-toggle.spec.ts` to keep journey-coverage spec files focused.

**`tests/e2e/visual-regression.spec.ts`** (current state): blank-light, blank-dark, empty-state assertions.

What 1.4 changes: nothing; the blank-screen and empty-state snapshots remain byte-identical. No regeneration required.

### Component Implementation Details

**`<Tick>` skeleton (Solid):**

```tsx
import { generateTickPath } from "../lib/tick-path";

export function Tick(props: { seed: string }) {
  // component body runs once per instance — `d` is cached for the row's lifetime
  const d = generateTickPath(props.seed);
  return (
    <svg viewBox="0 0 14 14" class="task-tick" aria-hidden={true}>
      <path d={d} />
    </svg>
  );
}
```

Note: `aria-hidden={true}` (not `aria-hidden="true"` string) is the Solid idiom; both render correctly, but boolean-form is conventional in this codebase.

**`tick-path.ts` skeleton (Solid; the dev should adapt and complete):**

```ts
const CANONICAL = {
  start: { x: 2.5, y: 7.5 },
  cp1: { x: 4, y: 9.5 },
  elbow: { x: 6, y: 11 },
  cp2: { x: 9, y: 7.5 },
  tip: { x: 12, y: 3.5 },
};

const JITTER_RANGE = 0.4; // ±0.4 px per UX-DR14

function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fmt(n: number): string {
  // 3 dp, strip trailing zeros, strip trailing dot
  return n.toFixed(3).replace(/\.?0+$/, "");
}

export function generateTickPath(seed: string): string {
  const rand = mulberry32(fnv1a(seed));
  const jitter = () => (rand() * 2 - 1) * JITTER_RANGE;
  const cp1x = CANONICAL.cp1.x + jitter();
  const cp1y = CANONICAL.cp1.y + jitter();
  const cp2x = CANONICAL.cp2.x + jitter();
  const cp2y = CANONICAL.cp2.y + jitter();
  return (
    `M ${fmt(CANONICAL.start.x)} ${fmt(CANONICAL.start.y)} ` +
    `Q ${fmt(cp1x)} ${fmt(cp1y)}, ${fmt(CANONICAL.elbow.x)} ${fmt(CANONICAL.elbow.y)} ` +
    `Q ${fmt(cp2x)} ${fmt(cp2y)}, ${fmt(CANONICAL.tip.x)} ${fmt(CANONICAL.tip.y)}`
  );
}
```

Treat the canonical numbers as a starting point — the dev should eyeball the rendered tick at 1× and 2× zoom and tune the corner geometry within the 14×14 viewBox. The ±0.4px jitter and the seeded determinism are the load-bearing contracts; the canonical positions are stylistic.

**`<TaskRow>` skeleton (full):**

```tsx
import { Show } from "solid-js";
import type { ActiveTask } from "../store/task-store";
import { toggleTaskCompleted } from "../store/task-store";
import { Tick } from "./Tick";

export function TaskRow(props: { task: ActiveTask }) {
  function handleRowClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.closest(".task-text")) return; // text-region clicks are 1.5 (edit)
    toggleTaskCompleted(props.task.id);
  }

  function handleRowKeyDown(event: KeyboardEvent) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "x" || event.key === "X") {
      event.preventDefault();
      toggleTaskCompleted(props.task.id);
    }
  }

  return (
    <li
      class="task-row"
      data-completed={props.task.completedAt !== null ? "true" : "false"}
      // tabindex=0 here; replaced by roving tabindex in Story 1.7
      tabindex={0}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
    >
      <input
        type="checkbox"
        class="task-checkbox"
        aria-label="Mark complete"
        checked={props.task.completedAt !== null}
        aria-checked={props.task.completedAt !== null}
        onChange={() => toggleTaskCompleted(props.task.id)}
        onClick={(e) => e.stopPropagation()}
      />
      <Show when={props.task.completedAt !== null}>
        <Tick seed={props.task.id} />
      </Show>
      <span class="task-text">{props.task.text}</span>
    </li>
  );
}
```

**`task-store.ts` extension:**

```ts
export type ActiveTask = {
  id: string;
  text: string;
  createdAt: number;
  completedAt: number | null; // NEW — aligns with packages/shared Task schema (Story 1.9)
};

// in createTask, add the field on the new task:
const task: ActiveTask = { id: generateId(), text, createdAt: Date.now(), completedAt: null };

// new export:
export function toggleTaskCompleted(id: string): void {
  setTasks(
    (t) => t.id === id,
    "completedAt",
    (current) => (current === null ? Date.now() : null),
  );
}
```

The path-form `setTasks(filter, key, updater)` is the Solid-idiomatic way to update one field of one item in a store-owned array. NEVER `tasks.find(t => t.id === id)!.completedAt = …` — that breaks reactivity (architecture § Pattern Examples → Anti-patterns).

### CSS additions to `globals.css`

Append to `apps/web/src/styles/globals.css` AFTER the existing `.task-row { padding: 8px 0; }` rule (do NOT edit the existing rule — extend it via the new compound rule below; CSS will merge them at the cascade layer).

```css
.task-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-height: 44px;
  cursor: pointer;
  outline: 0;
}

.task-row:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 4px;
  border-radius: 2px;
}

.task-row[data-completed="true"] .task-text {
  text-decoration: line-through;
  color: var(--color-ink-muted);
}

.task-checkbox {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  margin: 0;
  clip-path: inset(50%);
  transition: none;
}

.task-row:hover .task-checkbox,
.task-row:focus-within .task-checkbox,
.task-row:focus-visible .task-checkbox {
  clip-path: none;
}

.task-row[data-completed="true"] .task-checkbox {
  clip-path: none;
}

.task-tick {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  stroke: var(--color-accent);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}
```

Token discipline: every colour resolves to a project token (`--color-accent`, `--color-ink-muted`). Spacing literals (4/8/14/44 px) are project-scale or required-by-spec dimensions.

The `:focus-visible` selector on `.task-row` reveals the focus ring on keyboard navigation only — mouse clicks do not show it (UX-DR15). 1.7 will refine focus to the roving-tabindex two-cursor model; 1.4's per-row `tabindex=0` is the temporary minimum for AC#1.

### Library / Framework Requirements

| Package                     | Version                                     | Source   | Why                              |
| --------------------------- | ------------------------------------------- | -------- | -------------------------------- |
| `solid-js`                  | already in `apps/web/package.json` (^1.9.5) | existing | reactivity primitives + `<Show>` |
| `uuidv7`                    | already added in 1.3                        | existing | task ids — used as `<Tick>` seed |
| `@solidjs/testing-library`  | already added in 1.3                        | existing | component testing                |
| `@testing-library/jest-dom` | root devDependencies                        | existing | DOM assertions                   |

**No new dependencies in this story.** The `tick-path.ts` PRNG is an inline ~20-line implementation — adding `seedrandom` or similar would breach the "minimum dependency surface" posture.

Do NOT install: any animation library (Motion One, Framer Motion, Solid Motion), any icon library (lucide-solid, etc. — the tick is hand-rolled per UX-DR14), any toast/modal/dialog library (anti-feature contract), any RNG library.

### File Structure Requirements

After this story the `apps/web` tree should look like:

```
apps/web/
├── public/
│   └── fonts/Fraunces-VF.woff2          # unchanged
├── src/
│   ├── components/
│   │   ├── App.tsx                      # unchanged
│   │   ├── CaptureLine.tsx              # unchanged
│   │   ├── CaptureLine.test.tsx         # unchanged
│   │   ├── TaskList.tsx                 # unchanged
│   │   ├── TaskList.test.tsx            # unchanged
│   │   ├── TaskRow.tsx                  # MODIFIED — completion checkbox, tick, click/keydown handlers, data-completed
│   │   ├── TaskRow.test.tsx             # REWRITTEN — replaces the "no input/svg/button" assertion with new contract
│   │   ├── Tick.tsx                     # NEW
│   │   └── Tick.test.tsx                # NEW
│   ├── store/
│   │   ├── task-store.ts                # MODIFIED — completedAt field; toggleTaskCompleted action
│   │   └── task-store.test.ts           # MODIFIED — new tests for toggle, no-op for missing id, default completedAt
│   ├── lib/
│   │   ├── ids.ts                       # unchanged
│   │   ├── ids.test.ts                  # unchanged
│   │   ├── tick-path.ts                 # NEW
│   │   └── tick-path.test.ts            # NEW
│   ├── styles/
│   │   ├── globals.css                  # MODIFIED — append focus-visible, data-completed, checkbox, tick rules
│   │   └── tailwind.css                 # unchanged
│   ├── theme-bootstrap.ts               # unchanged
│   ├── theme-bootstrap.test.ts          # unchanged
│   ├── design-tokens.test.ts            # unchanged — must continue to pass
│   └── index.tsx                        # unchanged
├── package.json                         # unchanged
├── tsconfig.json                        # unchanged
└── vite.config.ts                       # unchanged

tests/e2e/
├── smoke.spec.ts                        # unchanged
├── visual-regression.spec.ts            # unchanged (empty-state snapshots remain valid)
├── j1-capture-work-review.spec.ts       # verified to still pass
├── j1-completion-toggle.spec.ts         # NEW — click + keyboard toggle assertions
└── j4-first-ever-visit.spec.ts          # unchanged
```

### Testing Requirements

**Unit tests** (Vitest + jsdom + `@solidjs/testing-library`):

- `apps/web/src/lib/tick-path.test.ts` — determinism, seed-variance, jitter range, two `Q` segments, distinctness across 1000 random seeds (per Task 2.5).
- `apps/web/src/components/Tick.test.tsx` — single SVG + path, viewBox, aria-hidden, deterministic d for same seed (per Task 3.3).
- `apps/web/src/store/task-store.test.ts` — extended with completion-state tests (per Task 1.5). Existing 7 tests must continue to pass; new tests are added, none replaced.
- `apps/web/src/components/TaskRow.test.tsx` — REWRITTEN. The existing two tests will not pass after 1.4 changes; replace with the new contract per Task 4.8. Cover: checkbox always present; aria-checked reflects state; `data-completed` reflects state; click outside text toggles; click inside text does not toggle; `x`/`X` on focused row toggles; other keys are no-ops; checkbox `onChange` toggles too.

**E2E tests** (Playwright):

- `tests/e2e/j1-completion-toggle.spec.ts` — full click-toggle and keyboard-toggle journey (per Task 6.3 / 6.4 / 6.5).
- All existing specs must continue to pass; only `j1-capture-work-review.spec.ts` may need a `.task-text`-scoped locator if the row-level `toHaveText` assertion regresses (it should not).

**Out of scope this story:**

- No property-based tests (`fast-check`) — those land in Story 1.6 alongside the undo stack and reversibility invariants (NFR-Maint-1). The "two ticks are not pixel-identical" property is asserted via the deterministic-PRNG test, not via fast-check.
- No latency-budget perf tests — Story 1.12 wires up the `latency-budget` CI job. This story's architectural choices (single `setStore` path-form call; CSS-only strike-through; SVG-on-mount caching) keep us under <50ms p95 (NFR-Perf-2) but the CI gate lands later.
- No axe-core run — Story 1.12 wires it; we honour the prerequisites here (always-present checkbox with `aria-label` + `aria-checked`, plain text via `<span>`, focus ring via `:focus-visible`).
- No keyboard-only E2E covering Journey 2 (the full `j`/`k`/`x`/`u`/`e`/`n` model) — Story 1.7 lands that. This story only covers the minimum: per-row tabindex + `x`/`X` toggle.
- No undo wiring — Story 1.6.
- No annunciator routing on completion — Story 1.10. (Toggling success surfaces nothing; that is the design — FR30.)

### Previous Story Intelligence (Story 1.3)

**Things that worked and we should keep doing:**

- Co-located unit tests next to source (`*.test.ts(x)`). 48 unit tests pass after 1.3; we add ~20 more here. Co-locate everything; do not create a separate `__tests__` directory.
- Store unit tests calling `clearAllTasks()` in `beforeEach` for isolation. Continue this pattern in the new toggle tests.
- The Solid testing-library recipe: `import { render, cleanup } from "@solidjs/testing-library"; afterEach(() => cleanup());`. Use `fireEvent.click` and `fireEvent.keyDown` (or `userEvent` if it cleans up easier) for interaction tests.
- Module-boundary discipline: `components/` only imports from `store/` and `lib/`. New imports here are `Tick` (component → component is allowed within the same dir), `toggleTaskCompleted` (component → store), `generateTickPath` (component → lib).

**Sandbox / environment quirks recorded by 1.1, 1.2, 1.3:**

- `pnpm` install needs `COREPACK_HOME=.corepack` prefix in some sandboxes.
- Network-blocked sandboxes: 1.3 added `uuidv7` and `@solidjs/testing-library` successfully; no new install in this story.
- E2E tests cannot launch in sandboxes that block `listen()`. 1.3 deferred all Playwright runs to CI; same fallback applies here.
- `tsx` has pipe issues in some sandboxes — use `node --experimental-strip-types` if needed.

**Visual-regression baseline status carried from 1.3:**

- 1.3's visual-regression baselines were deferred to CI (sandbox couldn't run Playwright). 1.4 does not add any new baselines (the empty-state and blank-theme snapshots are unchanged). If/when CI generates the 1.3 baselines, 1.4's E2E specs will run against them — no rebaseline expected for 1.4.

**Pre-existing lint envelope:**

- 1.3 fixed a `playwright.config.ts` Node-globals gap and a `tests/e2e/**` browser-globals gap in `eslint.config.js`. No further fixes expected for 1.4.

**Type-strictness gotcha noted in 1.3:**

- `noUncheckedIndexedAccess` requires non-null assertions in tests that index into store arrays (`tasks[0]!.text`). Same applies in this story's new toggle tests when reading `tasks[0]!.completedAt` after a toggle.

**Discrepancy that 1.2 surfaced and 1.3 inherited (still relevant):**

- `--color-ink-muted` (light) is `#1F1A14A6` (alpha ≈ 0.65) in `globals.css`, NOT the `#1F1A1499` (alpha 0.6) the epic file lists — the test in `design-tokens.test.ts` is the source of truth. This is the colour 1.4 strike-through depends on for the dim treatment; the contrast is verified there. Do NOT "correct" the alpha back to 0x99.

### Git Intelligence — recent commits

Recent commits (`git log --oneline -5`):

```
1ea97a9 feat: add story 1.3 task capture loop and empty state implementation   ← 1.3 final
cd52139 feat: complete design tokens, theme bootstrap, and typography system   ← 1.2 final
9d60192 feat(web): add theme support, custom fonts, and design tokens          ← 1.2 mid
a74c081 feat(ci): add anti-features and e2e test workflows                     ← 1.1 follow-up
f87b54e chore: add bmad-todo-checklist.html to gitignore
```

Commit-message style: imperative mood, conventional-commits prefix (`feat:`, `feat(web):`, `feat(ci):`, `chore:`). Multi-line body listing concrete changes. Match this style for the 1.4 commit (suggested title: `feat(web): add task completion, hand-textured Tick component, and visual completed state`).

`git status` at session start (per harness): clean. Start the 1.4 implementation from a clean tree.

### Latency budget reminder

NFR-Perf-2 (<50ms p95 completion-gesture-to-strikethrough) is **not** CI-gated until Story 1.12, but the architectural choices here are what allow it to hold:

- `setStore` path-form call → Solid only re-renders the `<li>`, the `<input>`, and the `<Show>` boundary. No virtual-DOM diff of unrelated rows.
- Strike-through via `text-decoration: line-through` is a paint-only style change, not a layout shift.
- `<Tick>` SVG is constructed once at mount and cached. Re-completing the same task instantiates a new `<Tick>` (because `<Show>` unmounts/remounts) — but the `seed=props.task.id` invariant means the same `d` string is computed, identically. (Caching across un/re-completion is not load-bearing for v1; UX spec line 979 explicitly accepts "fresh variance for re-completion" as an alternative — but seeding by `id` gives us "same tick" by happy accident, which the property test will continue to verify.)

If you find yourself reaching for a `requestAnimationFrame` or a setTimeout, stop — the design is sub-frame and synchronous.

### Project Context Reference

- PRD: `_bmad-output/planning-artifacts/prd.md` (FR6/FR7 toggle complete; FR10 retain completed; FR15 no checkbox at rest; FR16 visible + ARIA paired; FR28 no spinner; FR30 no success indicator; FR42 semantic roles; NFR-Perf-2 <50ms; NFR-A11y-7 ≥44px tap target).
- Architecture: `_bmad-output/planning-artifacts/architecture.md` § Frontend Architecture; § Project Structure (file locations for `components/Tick.tsx` line 638, `lib/tick-path.ts` line 663); § Implementation Patterns; § Pattern Examples → Anti-patterns; § Requirements to Structure Mapping (FR6–13 → `<TaskRow>`, `task-store.completeTask`).
- UX spec: `_bmad-output/planning-artifacts/ux-design-specification.md` § `<TaskRow>` component spec lines 827–867 (anatomy, states, behaviours, accessibility); § `<Tick>` component spec lines 955–980 (Bezier variance, aria-hidden, property test); § `<FocusRing>` lines 982–1008; § Implementation Roadmap items 7–8.
- Epics: `_bmad-output/planning-artifacts/epics.md` § Story 1.4 (acceptance criteria source); UX-DR11 (TaskRow); UX-DR14 (Tick variance); FR6, FR10, FR15, FR16.
- Previous story file: `_bmad-output/implementation-artifacts/1-3-task-capture-loop-and-empty-state.md` (store conventions, test patterns, sandbox quirks).
- ANTI-FEATURES contract: `scripts/check-anti-features.sh` (forbidden patterns enforced by lint).

### References

- [Source: epics.md#Story 1.4] — acceptance criteria source.
- [Source: epics.md#FR6] — single-keystroke / single-tap completion.
- [Source: epics.md#FR7] — toggle uncomplete via same gesture.
- [Source: epics.md#FR10] — completed tasks remain visible in session.
- [Source: epics.md#FR15] — no checkbox at rest; affordances appear on focus / hover.
- [Source: epics.md#FR16] — visible mark + programmatic `aria-checked`; both signals.
- [Source: epics.md#FR28, FR30] — no spinner / saving / success indicator.
- [Source: epics.md#FR42] — semantic roles for assistive tech.
- [Source: epics.md#FR53] — no decorative motion (sub-frame strike-through).
- [Source: epics.md#NFR-Perf-2] — <50ms p95 completion-to-strikethrough (CI-enforced in 1.12).
- [Source: epics.md#NFR-A11y-7] — ≥44×44 px tap target on mobile.
- [Source: epics.md#UX-DR11] — `<TaskRow>` anatomy: always-present checkbox via `clip-path: inset(50%)`; `aria-checked`; no truncation.
- [Source: epics.md#UX-DR14] — `<Tick>` 14×14 SVG; ±0.4px Bezier control-point variance seeded by id; stroke `--color-accent` 2.2px round; `aria-hidden="true"`; property test for distinct paths.
- [Source: epics.md#UX-DR15] — `<FocusRing>` `:focus-visible` 2px solid `--color-accent` outline 4px offset 2px radius.
- [Source: epics.md#UX-DR25] — mobile full-row tap target for completion ≥44×44px; tap on text → edit; tap on row outside text → toggle complete.
- [Source: epics.md#AR3] — Tailwind v4 strict-token mode; no default-palette utilities.
- [Source: architecture.md#Frontend Architecture] — uncontrolled-input rationale (CaptureLine — unchanged); Solid primitives; no virtualization v1.
- [Source: architecture.md#Implementation Patterns & Consistency Rules — Naming Patterns] — file/component naming, named exports, boolean prefixes.
- [Source: architecture.md#Implementation Patterns & Consistency Rules — Structure Patterns] — module boundaries (components → store, components → lib).
- [Source: architecture.md#Pattern Examples — Anti-patterns] — `setStore` path-form not `.find().field=`; named exports only; no toast/Skeleton/Spinner; no try/catch banners; no mid-keystroke autocomplete rewrite.
- [Source: architecture.md#Complete Project Directory Structure] — `apps/web/src/components/Tick.tsx` and `apps/web/src/lib/tick-path.ts` paths.
- [Source: architecture.md#Decision Impact Analysis — Implementation Sequence] — Story 1.4 is the completion / `<TaskRow>` focused+completed variant + `<Tick>` step.
- [Source: architecture.md#Requirements to Structure Mapping] — FR6–13 → `components/TaskRow.tsx`, `store/task-store.ts (completeTask)`.
- [Source: ux-design-specification.md#`<TaskRow>` component spec] — anatomy lines 833–838; states lines 842–849; accessibility lines 854–858; behaviour lines 864–867.
- [Source: ux-design-specification.md#`<Tick>` component spec] — Bezier variance lines 957–966; behaviour lines 977–980; property-based-test contract.
- [Source: ux-design-specification.md#Two-cursor focus model] — capture-line stickiness on `x` (full implementation in 1.7; this story does not yet preserve capture-line caret on toggle, since list focus owns the row in 1.4 — flag below).
- [Source: 1-3-task-capture-loop-and-empty-state.md#Dev Notes] — Solid component conventions, sandbox quirks, lint envelope, visual-regression baseline status.

### Open question to surface in completion notes (NOT a blocker for this story)

The two-cursor focus model (UX-DR17, UX spec § Two-cursor focus model lines 1153–1154) requires that pressing `x` on a focused row does NOT steal focus from the capture line. **In this story**, pressing `x` requires the row's `<li>` to have keyboard focus (`document.activeElement === li`), which by definition means the capture line does NOT have it at that moment. The full two-cursor model — global keydown handler on `<App>` that dispatches `x` to the focused-row index in `focus-store` while leaving the capture-line caret undisturbed — lands in Story 1.7 along with `j`/`k`/`n`. This story's per-row `tabindex={0}` is the temporary minimum that lets AC#1 (`x` toggles) be exercised by manual / E2E tests. Story 1.7 will replace it with the roving-tabindex pattern. Note this in the completion notes; do not attempt to anticipate 1.7's design here.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — clean implementation, no debugging required.

### Completion Notes List

- **Task 1**: Extended `ActiveTask` with `completedAt: number | null`, defaulting to `null`. Added `toggleTaskCompleted(id)` using Solid's path-form `setStore(filter, key, updater)`. 7 new unit tests (total 15 in task-store.test.ts).
- **Task 2**: Implemented `generateTickPath` with FNV-1a hash + Mulberry32 PRNG. 20 lines of TS, no dependencies. Determinism, variance, and jitter-range all verified. 5 unit tests including 1000-seed distinctness property test.
- **Task 3**: Built `<Tick>` component — renders once per instance (Solid invariant), no `createMemo` needed. `aria-hidden={true}`, SVG styling via CSS tokens. 5 unit tests.
- **Task 4**: Extended `<TaskRow>` with checkbox (always present, clip-path hidden at rest), `<Tick>` (shown via `<Show>` on completion), `data-completed` attr, `handleRowClick` (text-region guard), `handleRowKeyDown` (x/X toggle, `target === currentTarget` guard). 9 unit tests replacing old 2-test file. Omitted `role="listitem"` from the skeleton since `<li>` already implies it and adding it causes jsdom warnings.
- **Task 5**: Appended CSS rules extending `.task-row` with flex layout, 44px min-height, focus-visible ring, completed strike-through. Checkbox hidden via `clip-path: inset(50%)`, revealed on hover/focus. Tick styled with token-only colors. All 26 design-token + theme-bootstrap tests continue to pass.
- **Task 6**: Created `j1-completion-toggle.spec.ts` with click toggle, keyboard toggle, and anti-feature regression tests. Existing `j1-capture-work-review.spec.ts` does not need modification — `<input>` elements don't contribute to `textContent`, so `toHaveText` assertions remain valid. E2E spec runs deferred to CI (sandbox blocks `listen()`).
- **Task 7**: All gates pass: `pnpm typecheck` (strict), `pnpm lint`, `bash scripts/check-anti-features.sh`, `pnpm test` (73/73 pass: 48 existing + 25 new), `pnpm build` (JS: 8.35 KB gzip, CSS: 2.15 KB gzip — total ~10.5 KB, well within budgets). E2E deferred to CI.
- **Bundle size**: 8.35 KB JS gzip + 2.15 KB CSS gzip = ~10.5 KB total. Delta from 1.3 (~9.4 KB) is ~1.1 KB — within expectations.
- **Two-cursor focus model note**: Per-row `tabindex={0}` is the temporary minimum for AC#1. Story 1.7 will replace with roving-tabindex. Pressing `x` currently requires the `<li>` to have focus (which means capture-line loses it). The full two-cursor model (global keydown → focus-store dispatch) lands in 1.7.
- **E2E test note**: All Playwright E2E specs committed but runs deferred to CI — sandbox blocks `listen()` (EPERM on pipe and TCP). Same limitation as Stories 1.1–1.3.

### File List

- `apps/web/src/store/task-store.ts` — MODIFIED (completedAt field, toggleTaskCompleted)
- `apps/web/src/store/task-store.test.ts` — MODIFIED (7 new tests)
- `apps/web/src/lib/tick-path.ts` — NEW (deterministic seeded tick-path generator)
- `apps/web/src/lib/tick-path.test.ts` — NEW (5 tests)
- `apps/web/src/components/Tick.tsx` — NEW (Tick SVG component)
- `apps/web/src/components/Tick.test.tsx` — NEW (5 tests)
- `apps/web/src/components/TaskRow.tsx` — MODIFIED (completion state, checkbox, tick, handlers)
- `apps/web/src/components/TaskRow.test.tsx` — REWRITTEN (9 tests replacing 2)
- `apps/web/src/styles/globals.css` — MODIFIED (appended focus-visible, data-completed, checkbox, tick CSS)
- `tests/e2e/j1-completion-toggle.spec.ts` — NEW (3 E2E tests)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED (status update)
- `_bmad-output/implementation-artifacts/1-4-task-completion-visual-state-and-tick-component.md` — MODIFIED (task tracking)

### Review Findings

- [x] [Review][Patch] `x`/`X` keydown handler accepts modifier combinations (Cmd+X cut, Ctrl+X cut, Alt+X) and toggles the row [`apps/web/src/components/TaskRow.tsx:9-14`] — fixed: added modifier guard + unit test
- [x] [Review][Patch] AC#2 row-click path is not exercised by E2E — `j1-completion-toggle.spec.ts` clicks the checkbox (which `stopPropagation`s through `onChange`) rather than the row outside `.task-text` [`tests/e2e/j1-completion-toggle.spec.ts:14-26`] — fixed: switched to `row.click({ position })` at the right edge
- [x] [Review][Patch] AC#3 active-state `aria-checked="false"` not asserted in the active-task test (Task 4.8 lists "aria-checked reflects state") [`apps/web/src/components/TaskRow.test.tsx:13-21`] — fixed: added the assertion
- [x] [Review][Patch] `tick-path.test.ts` jitter-range test uses a single seed; loop across multiple seeds to verify the ±0.4 invariant across the distribution [`apps/web/src/lib/tick-path.test.ts:25-36`] — fixed: now loops 200 seeds
- [x] [Review][Defer] Row keydown ignores Space/Enter (a11y convention for activating focusable rows) [`apps/web/src/components/TaskRow.tsx:9-14`] — deferred to Story 1.7 keyboard navigation
- [x] [Review][Defer] `tabindex={0}` on every `<li>` linearizes tab traversal with N tasks [`apps/web/src/components/TaskRow.tsx:21`] — deferred to Story 1.7 roving-tabindex (already noted in code)
- [x] [Review][Defer] Clip-path-hidden checkbox remains focusable creating a phantom focus stop [`apps/web/src/styles/globals.css:140-148`] — deferred to Story 1.7 / 1.8 a11y audit
- [x] [Review][Defer] Static `aria-label="Mark complete"` doesn't switch to "Mark incomplete" when completed [`apps/web/src/components/TaskRow.tsx:25`] — spec-prescribed literal; revisit in Story 1.8 a11y audit
- [x] [Review][Defer] `window.matchMedia` unavailable case throws in theme bootstrap (pre-existing) [`apps/web/index.html:7-30`] — deferred, pre-existing gap from Story 1.2

## Change Log

- 2026-04-27: Story created and set to ready-for-dev. Comprehensive context engine analysis completed.
- 2026-04-27: Implementation complete. All 7 tasks done, 73/73 unit tests pass, all gates green. Status → review.
- 2026-04-27: Code review complete. 4 patches identified, 5 deferrals, ~22 dismissed. Findings appended above.
- 2026-04-27: All 4 patches applied and verified (74/74 unit tests pass, typecheck/lint/anti-features clean). Status → done.
