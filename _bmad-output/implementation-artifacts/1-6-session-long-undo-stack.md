# Story 1.6: Session-Long Undo Stack

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Sam,
I want to undo any action — completion toggle, edit, or deletion — during my session,
so that mistakes are instantly reversible without fear.

## Acceptance Criteria

1. **Given** Sam has toggled completion on a task, **When** Sam presses `U`, **Then** the task returns to its prior completion state with its original text and position intact.

2. **Given** Sam has edited a task, **When** Sam presses `U`, **Then** the task text is restored to its pre-edit value.

3. **Given** Sam has deleted a task, **When** Sam presses `U`, **Then** the task reappears at its original position in the list with its original text and completion status.

4. **Given** multiple actions have been taken, **When** Sam presses `U` repeatedly, **Then** actions are undone in reverse order (LIFO); each press undoes exactly one action.

5. **Given** Sam presses `U` with an empty undo stack, **Then** nothing happens; no error or feedback is shown.

6. **And** the undo stack is session-scoped (lost on page reload; cross-session undo is Growth scope).

7. **And** each stack entry stores `{ inverseMutation, timestamp }`.

8. **And** popped inverse mutations travel through the same `applyMutation` path as user mutations (idempotency-safe once persistence lands in Story 1.9).

9. **And** 100% of destructive operations (complete, uncomplete, edit, delete) have reversibility tests verifying exact-state restoration: text, position, and completion status.

## Tasks / Subtasks

- [x] Task 1: Create `store/undo-stack.ts` with typed inverse-mutation discriminated union (AC: #1, #2, #3, #4, #5, #6, #7, #8)
  - [x] 1.1 New file `apps/web/src/store/undo-stack.ts`. Define and export the `InverseMutation` discriminated union exactly as below — this is the contract Story 1.9 will preserve when `applyMutation` is generalized for sync:
    ```ts
    export type InverseMutation =
      | { type: "insert"; task: ActiveTask; index: number }
      | { type: "updateText"; id: string; previousText: string }
      | { type: "setCompletedAt"; id: string; previousCompletedAt: number | null };
    ```
  - [x] 1.2 Define and export the `UndoEntry` type: `{ inverseMutation: InverseMutation; timestamp: number }`. The `timestamp` is `Date.now()` at push time (used for telemetry/debugging only in v1; not user-visible).
  - [x] 1.3 Create the stack with `createStore<UndoEntry[]>([])` from `solid-js/store`. Export the stack as a read accessor `undoStack`. Do NOT export the setter — encapsulate behind `pushUndo` / `popUndo` / `clearUndoStack` so callers cannot bypass the LIFO semantics.
  - [x] 1.4 Implement `pushUndo(entry: { inverseMutation: InverseMutation; timestamp?: number }): void`. Default `timestamp` to `Date.now()`. Append to the END of the array (so `pop` returns the most-recent entry — LIFO).
  - [x] 1.5 Implement `popUndo(): UndoEntry | undefined`. Read the last entry; if undefined, return undefined (no mutation). Else `setUndoStack(prev => prev.slice(0, -1))` and return the popped entry.
  - [x] 1.6 Implement `applyInverseMutation(m: InverseMutation): void`:
    - `insert`: call `insertTaskAtIndex(m.task, m.index)`.
    - `updateText`: call `updateTaskText(m.id, m.previousText)`. (Guard inside `updateTaskText` rejects empty strings, but `previousText` is guaranteed non-empty because whitespace edits are recorded as a `delete`-then-`insert` pair, never as `updateText` — see Task 3.)
    - `setCompletedAt`: call `setTaskCompletedAt(m.id, m.previousCompletedAt)` (added to `task-store.ts` in Task 2). This sets the EXACT prior value (including the original timestamp), not a re-toggle that would mint a new timestamp and violate AC#1's "original... intact".
  - [x] 1.7 Implement and export `applyUndo(): boolean`. `const entry = popUndo(); if (!entry) return false; applyInverseMutation(entry.inverseMutation); return true;`. Returning a boolean lets the App-level handler short-circuit cleanly without throwing on AC#5's empty-stack case.
  - [x] 1.8 Implement and export `clearUndoStack(): void` — `setUndoStack(() => [])`. Used by tests' `beforeEach` for isolation. Not called by user-facing code in this story.
  - [x] 1.9 Module-boundary check: `undo-stack.ts` lives in `store/` and may import from `task-store` (sibling). It MUST NOT import from `components/` or `sync/`. Verified by `eslint.config.js`'s `import/no-restricted-paths` (already configured per Story 1.5 Dev Notes).

- [x] Task 2: Add `setTaskCompletedAt` exact-set primitive to `task-store.ts` (AC: #1, #4, #9)
  - [x] 2.1 Add `export function setTaskCompletedAt(id: string, value: number | null): void` to `apps/web/src/store/task-store.ts`. Implementation: `setTasks((t) => t.id === id, "completedAt", value)`. Non-existent id is a no-op (Solid's path-form filter handles this naturally — no match → no write).
  - [x] 2.2 Why this is separate from `toggleTaskCompleted`: the toggle function flips between `null` and `Date.now()`, which mints a NEW timestamp on every flip. Undo of an uncomplete-from-completed-at-T must restore EXACTLY `T`, not a new `Date.now()`. `setTaskCompletedAt` is the exact-state primitive used by undo replay. Active task code paths still use `toggleTaskCompleted`.
  - [x] 2.3 Add unit tests to `task-store.test.ts`:
    - sets a null `completedAt` to a timestamp
    - sets a timestamp `completedAt` back to null
    - preserves text, id, createdAt, and position
    - non-existent id is a no-op
    - All 26 existing `task-store.test.ts` tests MUST continue to pass.

- [x] Task 3: Wire snapshot-then-push at every destructive call site in `TaskRow.tsx` (AC: #1, #2, #3, #7, #8, #9)
  - [x] 3.1 Import in `TaskRow.tsx`: `import { pushUndo } from "../store/undo-stack";` and add `getTaskById` and `tasks` to the existing `task-store` import (`tasks` is needed for `findIndex` calls; `getTaskById` returns a snapshot clone — see Story 1.5 Review Findings line 485).
  - [x] 3.2 **Toggle complete via `x`/`X` keystroke** (`handleRowKeyDown`): before calling `toggleTaskCompleted(props.task.id)`, capture `const previousCompletedAt = props.task.completedAt;`. After the toggle call, push: `pushUndo({ inverseMutation: { type: "setCompletedAt", id: props.task.id, previousCompletedAt } });`. Order: snapshot → toggle → push (the toggle is synchronous; reading `props.task.completedAt` before the toggle gives the pre-toggle value).
  - [x] 3.3 **Toggle complete via row click** (`handleRowClick`, click outside `.task-text`): same pattern — capture `previousCompletedAt`, call `toggleTaskCompleted`, push inverse.
  - [x] 3.4 **Toggle complete via checkbox `onChange`**: same pattern. The current handler is `onChange={() => toggleTaskCompleted(props.task.id)}` — extract this to a named function `handleCheckboxChange()` that does snapshot → toggle → push.
  - [x] 3.5 **Delete via `D`/`d` keystroke** (`handleRowKeyDown`): replace the placeholder comments left by Story 1.5 (`apps/web/src/components/TaskRow.tsx:104-106`):
    ```ts
    } else if (event.key === "d" || event.key === "D") {
      event.preventDefault();
      const snapshot = getTaskById(props.task.id);
      const index = tasks.findIndex((t) => t.id === props.task.id);
      if (!snapshot || index === -1) return;
      deleteTask(props.task.id);
      pushUndo({ inverseMutation: { type: "insert", task: snapshot, index } });
    }
    ```
    Capture BOTH snapshot and index BEFORE `deleteTask` — once deleted, the task is gone from the store and `findIndex` returns -1.
  - [x] 3.6 **Edit commit — text change** (`commitEdit`): replace the placeholder comments at `apps/web/src/components/TaskRow.tsx:53-55`:
    ```ts
    } else if (newText.trim() !== originalText) {
      const previousText = originalText;
      updateTaskText(props.task.id, newText.trim());
      pushUndo({ inverseMutation: { type: "updateText", id: props.task.id, previousText } });
    }
    ```
    `originalText` is captured by `enterEditMode` (already in place). Push AFTER the `updateTaskText` call so that if `updateTaskText` is ever extended to throw on invalid input, no orphan undo entry is left.
  - [x] 3.7 **Edit commit — whitespace-only delete** (`commitEdit`): replace the placeholder comments at `apps/web/src/components/TaskRow.tsx:49-51`:
    ```ts
    if (newText.trim().length === 0) {
      const snapshot = getTaskById(props.task.id);
      const index = tasks.findIndex((t) => t.id === props.task.id);
      if (!snapshot || index === -1) {
        setIsEditing(false);
        return;
      }
      deleteTask(props.task.id);
      pushUndo({ inverseMutation: { type: "insert", task: snapshot, index } });
    }
    ```
    Same snapshot-before-delete pattern as Task 3.5. The `snapshot.text` will be the *pre-edit* original text (because `getTaskById` reads from the store, which has not been mutated yet — the contenteditable holds the whitespace-only buffer locally), so undoing a whitespace-delete restores the task to its pre-edit state, not to whitespace. Verify this assumption in tests (Task 5.5).
  - [x] 3.8 **Do NOT push undo for `cancelEdit`** — Escape during edit is not a destructive action; it discards the in-progress edit without mutating the store. No store mutation → no undo entry.
  - [x] 3.9 **Do NOT push undo on undo replay** — `applyInverseMutation` calls `updateTaskText`, `insertTaskAtIndex`, `setTaskCompletedAt`. None of those store functions push undo entries themselves. The push-on-action discipline is enforced ONLY at the user-action call sites in TaskRow / App. This keeps the architecture's "single `applyMutation` path" (architecture.md line 480) achievable in Story 1.9 without re-entrancy.

- [x] Task 4: Add window-level `u`/`U` undo handler in `App.tsx` (AC: #1–#5)
  - [x] 4.1 Import: `import { onMount, onCleanup } from "solid-js";` and `import { applyUndo } from "../store/undo-stack";`.
  - [x] 4.2 Inside the `App` component, add:
    ```ts
    onMount(() => {
      const handler = (event: KeyboardEvent) => {
        if (event.key !== "u" && event.key !== "U") return;
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
        applyUndo();
      };
      window.addEventListener("keydown", handler);
      onCleanup(() => window.removeEventListener("keydown", handler));
    });
    ```
  - [x] 4.3 Add the helper `isEditableTarget(target: EventTarget | null): boolean` in the same file (or in `apps/web/src/lib/dom.ts` if it grows — for one helper, inline is fine):
    ```ts
    function isEditableTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return true;
      if (target.isContentEditable) return true;
      return false;
    }
    ```
    This is the guard that prevents `u` typed into `<CaptureLine>` (an `<input>`) or into a contenteditable task in edit mode from triggering undo. The current capture-input is `<input type="text">` — `tagName === "INPUT"` catches it. Edit-mode spans use `contentEditable="plaintext-only"` — `target.isContentEditable === true` catches them.
  - [x] 4.4 Why window-level and not per-row: AC#3 demands undo work after deleting the LAST task — at that moment no row has focus and `<TaskRow>` no longer exists. AC#5 demands undo with an empty stack be a no-op regardless of focus. A window listener fires regardless of focused element (subject to the editable guard). Per-row would fail both ACs in the no-row state.
  - [x] 4.5 Story 1.7 absorbs `j`/`k`/`x`/`e`/`d`/`u`/`n`/`cmd+enter`/`cmd+shift+L` into a comprehensive global keyboard model (UX spec line 798 — `<App>` "owns global keyboard shortcuts"). Keep the Task 4 handler self-contained (single function, single addEventListener) so 1.7 can lift-and-shift it cleanly. Do NOT prematurely generalize into a registry.
  - [x] 4.6 Do NOT add a `u`/`U` branch to `handleRowKeyDown` in TaskRow. The window listener handles all `u` keystrokes; doubling up risks double-fire (depending on capture/bubble) and complicates the 1.7 refactor.

- [x] Task 5: Unit tests for `undo-stack.ts` and TaskRow undo wiring (AC: #1–#9)
  - [x] 5.1 Create `apps/web/src/store/undo-stack.test.ts`. Use the same Vitest + jsdom setup as `task-store.test.ts`. `beforeEach`: call `clearAllTasks()` AND `clearUndoStack()` for isolation. Tests:
    - `pushUndo` appends to the end; `undoStack` reflects the new length.
    - `popUndo` returns the last-pushed entry (LIFO); stack length decreases by 1.
    - `popUndo` on empty stack returns `undefined` and does not throw.
    - `applyUndo` on empty stack returns `false`; on non-empty returns `true` and applies the inverse.
    - `applyInverseMutation` with `insert` calls `insertTaskAtIndex` (verify task reappears at the correct index in `tasks`).
    - `applyInverseMutation` with `updateText` calls `updateTaskText` (verify text changes back).
    - `applyInverseMutation` with `setCompletedAt` calls `setTaskCompletedAt` (verify exact value restored, including the original timestamp).
    - `clearUndoStack` empties the stack.
  - [x] 5.2 **Reversibility tests (AC#9, NFR-Rel-3)** — add a new `describe("reversibility")` block in `undo-stack.test.ts`. For each of the 4 destructive ops, assert exact-state restoration. These satisfy AC#9's "100% of destructive operations have reversibility tests verifying exact-state restoration: text, position, and completion status":
    - **complete (null → timestamp) → undo**: create task, snapshot `{text, position, completedAt: null}`, toggle complete via `toggleTaskCompleted`, push `setCompletedAt` inverse, apply undo. Assert text, position (index 0), and `completedAt === null`.
    - **uncomplete (timestamp → null) → undo**: create task, complete it (record the timestamp T), snapshot `{text, position, completedAt: T}`, toggle uncomplete, push `setCompletedAt` inverse with `previousCompletedAt: T`, apply undo. Assert `completedAt === T` (the EXACT original timestamp, not a new `Date.now()` — this is why we use `setCompletedAt` not a re-toggle).
    - **edit-text → undo**: create task with text "original", snapshot `previousText`, call `updateTaskText(id, "edited")`, push `updateText` inverse, apply undo. Assert text === "original", position unchanged, completion state unchanged.
    - **delete → undo**: create 3 tasks (so the deleted one has middle position 1), snapshot `{task, index: 1}`, call `deleteTask`, push `insert` inverse, apply undo. Assert task length === 3, the restored task's text/id/createdAt/completedAt match the snapshot exactly, and it is at index 1 (original position).
  - [x] 5.3 **Multi-step LIFO test (AC#4)**: create task, edit it (push 1), complete it (push 2), delete it (push 3). Stack length === 3. `applyUndo()` × 1 → task reappears (delete reversed). `applyUndo()` × 1 → task is uncompleted (complete reversed). `applyUndo()` × 1 → task text is original (edit reversed). Stack length === 0. One more `applyUndo()` → returns `false`, no change.
  - [x] 5.4 **Empty-stack no-op test (AC#5)**: with empty `undoStack`, call `applyUndo()`. Assert returns `false`. Assert `tasks` is unchanged. Assert no error thrown.
  - [x] 5.5 Extend `TaskRow.test.tsx` with push-side tests (verify TaskRow's call sites produce the correct undo entries):
    - Pressing `X` on a focused active task: assert `undoStack.length === 1` and the entry is `{ type: "setCompletedAt", id, previousCompletedAt: null }`.
    - Pressing `X` on a focused completed task (with `completedAt: T`): assert entry is `{ type: "setCompletedAt", id, previousCompletedAt: T }`.
    - Clicking the row outside `.task-text`: same as `X` — assert undo entry pushed.
    - Clicking the checkbox: same — assert undo entry pushed exactly once (not double-fired by both `onChange` and the row click bubble — the existing `onClick={(e) => e.stopPropagation()}` on the checkbox prevents the row's click handler from firing; verify this still holds after refactor).
    - Pressing `D` on a focused task: assert entry is `{ type: "insert", task: <snapshot>, index: 0 }`. Snapshot must be a clone (not the live store proxy) — assert mutating the snapshot does not affect the live task post-undo.
    - Editing a task via `E` + Enter with new text: assert entry is `{ type: "updateText", id, previousText: <original> }`.
    - Editing a task via `E` + Enter with whitespace-only: assert entry is `{ type: "insert", task: <pre-edit-snapshot>, index } ` and the snapshot's `text` is the ORIGINAL (not the whitespace buffer). This is AC#9's "exact-state restoration" — undoing a whitespace-delete must restore the original text.
    - Pressing Escape during edit: assert NO undo entry pushed (cancel is not destructive).
    - All 20 existing TaskRow tests (10 from 1.4 + 10 from 1.5) MUST continue to pass.
  - [x] 5.6 Create `apps/web/src/components/App.test.tsx` for the global `u` handler:
    - Renders `<App />`, simulates `window.dispatchEvent(new KeyboardEvent("keydown", { key: "u" }))` after pushing an undo entry — assert the entry is applied and stack is empty.
    - Pushes one entry, dispatches `u` with `target` inside the capture `<input>` (or simulates `event.target.tagName === "INPUT"` — easiest: focus the capture input first, then `keyboard.press("u")` via testing-library) — assert the entry remains on the stack (typing in the input must not trigger undo).
    - Dispatches `u` with empty stack — assert no error.
    - Dispatches `Cmd+u` (browser back-history shortcut) — assert undo handler does NOT fire (the modifier guard skips it).
    - Component cleanup removes the listener (smoke check: render + unmount + dispatch — assert no apply happens).

- [x] Task 6: E2E tests — wire the deferred undo half of `j2-delete-undo.spec.ts` (AC: #3, #5)
  - [x] 6.1 Extend `tests/e2e/j2-delete-undo.spec.ts` (currently delete-only — Story 1.5 deferred undo to here):
    - **Undo restores deleted task**: capture "Buy bread" → press Enter → focus row → press `D` → assert 0 rows → press `u` → assert task reappears with text "Buy bread".
    - **Undo with empty stack is a no-op**: open app (empty list, capture line focused) → BLUR the input by pressing Tab → press `u` → assert no error and no row appears. (Pressing `u` while the input has focus would type "u" — covered by the unit test in 5.6.)
    - **LIFO multi-undo**: capture "A" → capture "B" → capture "C" → focus first row (which is "C" by newest-first order) → press `D` (deletes "C") → focus next first row ("B") → press `D` (deletes "B") → press `u` → "B" reappears at the top → press `u` → "C" reappears at the top.
  - [x] 6.2 Create `tests/e2e/j6-undo-edit.spec.ts`:
    - Capture "buy oat milk" → press Enter → click on the task text → change to "buy almond milk" → press Enter → focus the row → press `u` → assert text is "buy oat milk" again.
    - Capture "draft text" → press Enter → click text → clear all (whitespace-only) → press Enter (whitespace-delete fires) → assert 0 rows → press `u` → assert task reappears with text "draft text" (original, not whitespace).
  - [x] 6.3 Create `tests/e2e/j7-undo-completion.spec.ts`:
    - Capture "wash dishes" → press Enter → focus row → press `X` (complete) → assert `data-completed="true"` and tick svg present → press `u` → assert `data-completed="false"` and svg absent → press `u` (empty stack now from THIS task's undo, but if other entries exist they pop first; design test with isolation in mind — single task).
    - Capture "vacuum" → press Enter → focus row → press `X` (complete; record the timestamp via reading the DOM is hard — instead verify visual state) → press `X` (uncomplete) → press `u` → assert `data-completed="true"` (the uncomplete is reversed; original completion timestamp restored — visually equivalent to "task is completed").
  - [x] 6.4 If the sandbox cannot launch Playwright (same limitation as 1.1–1.5), commit the spec files and mark E2E runs as deferred to CI. Sandbox run is not a release blocker for any prior story; same applies here.

- [x] Task 7: Verify all gates (AC: all)
  - [x] 7.1 `pnpm typecheck` — passes with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. The `InverseMutation` discriminated union must be exhaustively switched in `applyInverseMutation`; TypeScript's `never`-check catches missing branches if you add `assertNever` (optional but recommended).
  - [x] 7.2 `pnpm lint` — passes. Module boundaries: `store/undo-stack.ts` imports only from `store/task-store.ts` and `solid-js`. `components/TaskRow.tsx` imports from `store/undo-stack.ts` and `store/task-store.ts`. `components/App.tsx` imports from `store/undo-stack.ts`. No reverse imports (`store/` → `components/`).
  - [x] 7.3 `bash scripts/check-anti-features.sh` — passes. The undo system introduces NO toast, modal, dialog, or success indicator (per AC and FR30: "no success toast on undo" — UX spec line 1140 explicitly forbids "1 item restored" toast). The undone state IS the feedback.
  - [x] 7.4 `pnpm test` — all unit tests pass. Expected count: 26 task-store + N new (target ≥4 for `setTaskCompletedAt`) + 20 TaskRow + ~9 new TaskRow undo-push tests + new `undo-stack.test.ts` (target ~15+ tests including reversibility) + new `App.test.tsx` (target ~5 tests).
  - [x] 7.5 `pnpm build` — succeeds. Bundle delta target: ≤+1KB JS gzipped (the undo logic is small: type union, push/pop/apply, single window listener). Hard ceiling per NFR6: ≤50KB initial JS gzipped — current ~8.72KB after 1.5, still well under. CSS delta: 0 (no new styles).
  - [x] 7.6 `pnpm test:e2e` — deferred to CI if sandbox cannot launch (same as 1.1–1.5). Spec files MUST be committed.

### Review Findings

- [x] [Review][Patch] `popUndo` shallow clone does not deep-clone nested `task` on `insert` mutations — store proxy reference risk [`apps/web/src/store/undo-stack.ts:38-42`]. The `{ ...last.inverseMutation }` spread copies `task` by reference, not by value. For `insert`-type mutations the `task` field remains a store proxy reference. Fix: type-check the mutation and spread `task` for `insert` variants.
- [x] [Review][Defer] Unbounded undo stack growth — no size cap [`apps/web/src/store/undo-stack.ts:31`] — deferred, session-scoped by design; practical concern only at thousands of operations
- [x] [Review][Defer] Stale index on undo-insert after intervening create/delete mutations [`apps/web/src/store/undo-stack.ts:49`] — deferred, inherent to index-based approach; only manifests when user performs other operations between delete and undo
- [x] [Review][Defer] No undo entry for `createTask` — user pressing `u` after creating a task undoes a prior unrelated action [`apps/web/src/components/CaptureLine.tsx`] — deferred, explicitly out of scope per AC#1–9
- [x] [Review][Defer] No `isComposing` guard on `handleRowKeyDown` in TaskRow [`apps/web/src/components/TaskRow.tsx:108`] — deferred, pre-existing from Story 1.5; safe in practice due to `event.target !== event.currentTarget` guard

## Dev Notes

### CRITICAL: Architecture vs Epic Naming (carried forward from 1.2 / 1.3 / 1.4 / 1.5)

The architecture document is the source of truth where it disagrees with the epic file:

1. **Framework: SolidJS, NOT React.** Use Solid's JSX (`class=` not `className=`, `onKeyDown`/`onClick`/`onChange`, `ref={el}` callbacks, `onMount`/`onCleanup`, `createStore`, `createSignal`, `<Show>`/`<For>`). Never destructure props — `props.task.text` not `const { task } = props`.
2. **Backend directory: `apps/api`.** Not relevant in this story (no backend work).
3. **Database: SQLite.** Not relevant in this story (still in-memory).

### Phase placement

Story 1.6 completes **Phase 4 (Reversibility)** in the architecture's implementation roadmap (UX spec § Implementation Roadmap items 10–12). Phase 4's three deliverables — undo stack, `<TaskRow>` edit variant, `u` keystroke — are split across 1.5 (edit variant + delete) and 1.6 (undo stack + `u` keystroke + wiring of all destructive ops).

Out of scope this story (preserved from 1.5):
- IndexedDB / outbox / service worker (Story 1.9).
- Idempotency keys (Story 1.9).
- Annunciator wiring (Story 1.10).
- Roving tabindex / global keyboard model (Story 1.7).
- Property-based tests via `fast-check` (architecture's NFR-Maint-1 target — `fast-check` is NOT yet a dependency; reversibility coverage in this story is deterministic. Property-based generalization is a follow-on, likely landing alongside Story 1.9 or 1.12).

### Architecture Compliance (load-bearing rules)

**Module boundaries (frontend) — enforced by `eslint.config.js`'s `import/no-restricted-paths`:**

- `components/` may import from `store/` and `lib/`. May NOT import from `sync/`.
- `store/` may import from `sync/`. May NOT import from `components/`. ✅ `undo-stack.ts` does NOT import from `components/`.
- `sync/` may NOT import from `components/` or `store/`.

This story modifies files in `components/` and `store/`. Cross-store import (`undo-stack` ↔ `task-store`) is allowed because both are in `store/`.

**Naming conventions:**

- Components: `PascalCase.tsx` matching the export name. Co-located test: `PascalCase.test.tsx`.
- Non-component modules: `kebab-case.ts`. Co-located test: `kebab-case.test.ts`. ✅ `undo-stack.ts` / `undo-stack.test.ts`.
- All exports are NAMED exports (`import/no-default-export` is `error`-level).
- Boolean variables: `isFoo` / `hasFoo` / `canFoo` / `shouldFoo`.
- Mutation type names: lowercase action verbs (`insert`, `updateText`, `setCompletedAt`) — match the `Mutation` discriminated-union convention defined in architecture.md line 478.

**Reactivity (Solid-idiomatic):**

- `createStore<UndoEntry[]>([])` for the undo stack (architecture.md line 474).
- Immutable updates: `setUndoStack(prev => [...prev, entry])` for push, `setUndoStack(prev => prev.slice(0, -1))` for pop. Never `prev.push(...)` or `prev.pop()` on the proxy — breaks reactivity.
- `onMount` / `onCleanup` for the window listener in `<App>`. Required so the listener is removed if `<App>` ever unmounts (HMR, future testing scenarios).

**Anti-feature contract (FR46–54, AR18; CI-grep enforced):**

Forbidden in this story (same as 1.5): `toast(`, `Snackbar`, `Toaster`, `Skeleton`, `Spinner`, `confirm(`, `alert(`, `<Modal`, `<Dialog`, `<ErrorBoundary`, `Streak`, `Achievement`, `Karma`, `XP`, emojis 🎉✨🏆.

Specifically for undo: NO "1 item restored" toast, NO "Undo" button, NO undo-history visualization. The undone state IS the feedback — UX spec line 1140 explicitly calls out this anti-pattern. Verified by the existing `check-anti-features.sh` grep job.

### Existing files this story modifies — current state and what must be preserved

**`apps/web/src/store/task-store.ts`** (current state after 1.5; reviewed at line 1–58):

```ts
// Existing exports: tasks, createTask, toggleTaskCompleted, updateTaskText,
// deleteTask, getTaskById, insertTaskAtIndex, clearAllTasks
// All 26 existing tests must continue to pass.
```

What 1.6 adds: `setTaskCompletedAt(id, value: number | null)`. Does NOT modify any existing function bodies. `getTaskById` already returns a shallow clone (Story 1.5 review patch line 485) — undo can rely on this.

**`apps/web/src/components/TaskRow.tsx`** (current state after 1.5; reviewed at line 1–142):

What 1.6 changes: replaces the four `// 1.6:` comment placeholders left by Story 1.5 with actual `pushUndo` calls (Tasks 3.5, 3.6, 3.7). Adds undo wiring to all 3 toggle paths (keystroke, click-outside-text, checkbox onChange — Tasks 3.2, 3.3, 3.4). Imports `pushUndo` from `../store/undo-stack` and adds `getTaskById` + `tasks` to the existing `task-store` import.

What must be preserved: `isEditing` signal, `enterEditMode` / `commitEdit` / `cancelEdit` / `handleEditKeyDown` / `handleEditFocusOut` flow, `placeCursorAtEnd` helper, `createRenderEffect` text-sync, `event.isComposing` IME guard, the `if (isEditing()) return` guard at the top of `handleRowClick` and `handleRowKeyDown`, the modifier-key guard (`event.metaKey || event.ctrlKey || event.altKey`), `tabindex={0}` (replaced in 1.7), checkbox `onClick={(e) => e.stopPropagation()}` (prevents click-toggle double-fire — verify this still holds after Task 3.4 refactors `onChange`).

**`apps/web/src/components/App.tsx`** (current state — reviewed at line 1–11; only renders `<CaptureLine />` and `<TaskList />` inside `<main>`):

What 1.6 adds: `onMount` block registering window-level `u` keydown listener; `onCleanup` removing it; `isEditableTarget` helper; imports `applyUndo` from `../store/undo-stack`.

What must be preserved: the `<main class="app-main bg-paper text-ink">` wrapper, the `<CaptureLine />` and `<TaskList />` children. Story 1.7 will add `data-theme` ownership and additional global shortcuts to App.

**`apps/web/src/styles/globals.css`** — NOT modified in this story. Undo has no visual representation (the undone state IS the feedback per UX spec line 1140).

### Component Implementation Details

**`InverseMutation` exhaustive-switch pattern (TypeScript safety):**

```ts
function applyInverseMutation(m: InverseMutation): void {
  switch (m.type) {
    case "insert":
      insertTaskAtIndex(m.task, m.index);
      return;
    case "updateText":
      updateTaskText(m.id, m.previousText);
      return;
    case "setCompletedAt":
      setTaskCompletedAt(m.id, m.previousCompletedAt);
      return;
  }
  // Optional: assertNever(m) for compile-time exhaustiveness
}
```

If a future story (1.9) adds a new inverse type without updating this switch, `noUncheckedIndexedAccess` + the discriminated union narrows `m` to `never` in the unhandled branch — surfacing a typecheck failure at the new call site.

**Toggle-completion snapshot capture (3 paths in TaskRow):**

The pre-toggle `completedAt` is read from `props.task.completedAt`. Solid's `createStore` reactivity guarantees `props.task` reads are synchronous against the current store state (no microtask gap). Reading `props.task.completedAt` BEFORE calling `toggleTaskCompleted` is safe and atomic.

```ts
function handleCheckboxChange() {
  const previousCompletedAt = props.task.completedAt;
  toggleTaskCompleted(props.task.id);
  pushUndo({
    inverseMutation: {
      type: "setCompletedAt",
      id: props.task.id,
      previousCompletedAt,
    },
  });
}
```

Apply the same shape in `handleRowClick` (the click-outside-text branch) and in the `x`/`X` branch of `handleRowKeyDown`.

**Whitespace-delete undo subtlety (Task 3.7):**

When the user enters edit mode and clears the text to whitespace, the contenteditable span holds the whitespace LOCALLY — the store still has the original text. `getTaskById(id)` reads from the store, so the snapshot's `text` is the original. `deleteTask` then removes the task. Pushing `{ type: "insert", task: snapshot, index }` records the original text. Undo restores the original. Verify in test 5.5 by editing "draft text" to "   ", committing, then undoing — task should reappear with "draft text" (NOT "   ").

**Empty-stack `u` is a no-op (AC#5):**

`applyUndo` returns `false` on empty stack. The window handler calls `event.preventDefault()` BEFORE `applyUndo()` — but only after passing the editable-target guard. This means: pressing `u` on an empty page (no rows, no input focused) calls `preventDefault` and `applyUndo` (which is a no-op). This is acceptable; `preventDefault` on `u` outside an input has no effect (browsers don't have a default action for `u`). If this becomes a concern, swap the order to `if (applyUndo()) event.preventDefault();` — but the current order is simpler and matches FR-Perf-1's "every keystroke handled in <16ms" by avoiding any conditional preventDefault.

### Interaction with Story 1.7 (Keyboard Navigation and Two-Cursor Focus Model)

Story 1.7 will:
1. Replace per-row `tabindex={0}` with **roving tabindex** on `<TaskList>`.
2. Lift `x`/`e`/`d`/`u` handlers off `<TaskRow>` and into `<App>`'s global keyboard model.
3. Add `j`/`k`/`ArrowDown`/`ArrowUp` for navigation.
4. Add `n` and `Cmd+Enter` to focus the capture line.
5. Wire **capture-line focus stickiness** (UX line 755).

This story (1.6) leaves the per-row keystroke handlers in place exactly as 1.5 left them, plus adds `u` at App level only. Story 1.7's lift will be: copy each per-row handler's logic into App's global handler, route by inspecting the focused row index from `focus-store`. The undo-push call sites (Task 3) will MOVE FROM TaskRow's per-row handlers INTO App's global handler — but the `pushUndo` call shape remains identical. The 1.7 refactor is purely a relocation; logic is unchanged.

### Interaction with Story 1.9 (Cross-Session Persistence and Offline-First Sync)

Story 1.9 will introduce:
1. `applyMutation(store, mutation)` — single entry point used identically for user actions and undo replays (architecture line 480).
2. Outbox enqueue on every mutation (architecture line 578).
3. Idempotency keys per mutation (architecture line 583).
4. IndexedDB persistence + reconciliation.

For 1.6, `applyInverseMutation` is the proto-`applyMutation` for undo replays. When 1.9 lands:
- The user-action paths (`createTask`, `toggleTaskCompleted`, `updateTaskText`, `deleteTask`) gain outbox+idempotency wiring.
- Undo replay paths (`insertTaskAtIndex`, `updateTaskText`, `setCompletedAt` via the inverse-mutation switch) ALSO gain outbox+idempotency wiring — because they go through the same `applyMutation` once it exists.
- The push-on-action discipline at TaskRow's call sites stays — undo pushes still happen at the destructive call site, BEFORE the action propagates to the outbox.
- `pushUndo`'s signature does not change. The `InverseMutation` discriminated union may grow new types (e.g., for sync-conflict-driven inverses) but existing types remain.

Keep the inverse-mutation type names in **mutation-shape vocabulary** (`insert`, `updateText`, `setCompletedAt`), NOT user-action vocabulary (`reverseDelete`, `reverseEdit`). This aligns with `Mutation` in `packages/shared/src/schema.ts` (architecture line 478) and avoids a rename when 1.9 generalizes the path.

### Interaction with Story 1.10 (Annunciator and Failure Feedback Routing)

If `applyInverseMutation` ever fails (e.g., trying to update a task that no longer exists because it was deleted by another tab — only relevant after 1.9 + multi-device in Growth), the failure should route through the annunciator, NOT a toast. For 1.6 with in-memory state, all inverse mutations are guaranteed to succeed (the task must exist — undo of an action on a deleted task is impossible because deleting it would have pushed an undo entry that, when popped, restores the task). No annunciator wiring required in this story.

### Interaction with Story 1.4 (Tick) and Story 1.5 (Edit/Delete) — preserve existing visual contract

Undo never changes visual chrome:
- Tick component is rendered when `completedAt !== null`. Undo of "complete" (sets `completedAt` to null) hides the tick reactively. No animation, no fade.
- Strike-through CSS follows `data-completed`. Undo flips `data-completed` reactively. Sub-frame; honors `prefers-reduced-motion: reduce` (no transition defined → instant by default).
- Bezier jitter (Tick) is seeded by task id. Undoing complete-then-complete-again on the same task produces the SAME tick path (same seed). This is correct per Story 1.4 AC#7's "stable across re-completions".

### Library / Framework Requirements

| Package | Version | Source | Why |
|---|---|---|---|
| `solid-js` | already installed (^1.9.5) | existing | `createStore`, `onMount`, `onCleanup` |

**No new dependencies in this story.** `KeyboardEvent`, `window.addEventListener`, and `Date.now()` are native browser APIs.

Do NOT install: `fast-check` (deferred to a property-based-tests story; 1.6's reversibility tests are deterministic), any undo/redo library (e.g., `immer-undo`, `mobx-state-tree`'s timeline — overkill for a typed inverse-mutation list), any keyboard-shortcut library (e.g., `mousetrap`, `tinykeys` — Story 1.7 will own this decision; for 1.6 a single `addEventListener` is sufficient).

### File Structure Requirements

After this story the modified/new files are:

```
apps/web/src/
├── components/
│   ├── App.tsx                       # MODIFIED — window-level u/U keydown listener
│   ├── App.test.tsx                  # NEW — tests for global U handler
│   ├── TaskRow.tsx                   # MODIFIED — pushUndo at every destructive call site
│   └── TaskRow.test.tsx              # MODIFIED — assert undo entries pushed correctly
├── store/
│   ├── task-store.ts                 # MODIFIED — add setTaskCompletedAt
│   ├── task-store.test.ts            # MODIFIED — add tests for setTaskCompletedAt
│   ├── undo-stack.ts                 # NEW — createStore<UndoEntry[]>, push/pop/applyUndo
│   └── undo-stack.test.ts            # NEW — stack mechanics + reversibility per AC#9

tests/e2e/
├── j2-delete-undo.spec.ts            # MODIFIED — wire the deferred undo half (delete already exists)
├── j6-undo-edit.spec.ts              # NEW — undo of text edit and whitespace-delete
└── j7-undo-completion.spec.ts        # NEW — undo of complete and uncomplete
```

All other files unchanged. No new component files — undo is store + global keystroke, no UI surface.

### Testing Requirements

**Unit tests** (Vitest + jsdom + `@solidjs/testing-library`):

- `undo-stack.test.ts` — push/pop/apply/clear mechanics + reversibility per AC#9 (4 destructive ops × exact-state assertion).
- `task-store.test.ts` — `setTaskCompletedAt` exact-set primitive (4 new tests; all 26 existing must continue to pass).
- `TaskRow.test.tsx` — undo-push assertions at all 6 destructive call sites (toggle×3, edit-text, edit-whitespace-delete, key-delete; cancel-edit pushes nothing); all 20 existing tests must continue to pass.
- `App.test.tsx` — global `u` handler: fires on body, ignored on input, ignored on contenteditable, ignored with Cmd modifier, no error on empty stack, listener cleaned up on unmount.

**E2E tests** (Playwright):

- `j2-delete-undo.spec.ts` — wire undo (delete exists from 1.5); add LIFO multi-undo + empty-stack-no-op.
- `j6-undo-edit.spec.ts` — text-edit undo + whitespace-delete undo restores original text.
- `j7-undo-completion.spec.ts` — complete→undo and uncomplete→undo journeys.

**Out of scope this story:**

- Property-based reversibility (fast-check) — deferred; covered by NFR-Maint-1 in a future story.
- Cross-session undo — Growth scope (UX spec line 635).
- Undo-of-create — not in AC#1–9 (which list only complete/uncomplete/edit/delete); architecture line 577 anticipates this but it can land alongside Story 1.9's `applyMutation` generalization.
- Latency-budget perf tests for undo — Story 1.12.
- Annunciator wiring for undo failures — not applicable in-memory; revisit in Story 1.10.

### Previous Story Intelligence (Story 1.5)

**Things that worked and we should keep doing:**

- Co-located unit tests next to source (`*.test.ts(x)`). 96 unit tests pass after 1.5 review patches.
- Store unit tests calling `clearAllTasks()` in `beforeEach` for isolation. For 1.6, also call `clearUndoStack()` in `beforeEach` for tests touching the undo stack.
- The Solid testing-library recipe: `import { render, cleanup } from "@solidjs/testing-library"; afterEach(() => cleanup());`.
- Module-boundary discipline: components → store/lib only.
- `getTaskById` returning a shallow clone (Story 1.5 review patch) — undo relies on this to avoid the snapshot mutating with the live store.
- `event.isComposing` guard for IME safety in keydown handlers (Story 1.5 review patch). Apply the same guard to the App-level `u` handler in Task 4.2 — although `u` is unlikely to participate in IME composition, the cost is one extra `if` and the consistency is worth it. Add `if (event.isComposing) return;` after the editable-target guard.
- `if (isEditing()) return` early-exit at the top of `handleRowClick` and `handleRowKeyDown` — preserve this guard exactly. Undo wiring must NOT introduce a path that fires during edit mode.

**Sandbox / environment quirks (carried from 1.1–1.5):**

- E2E tests cannot launch in sandboxes that block `listen()`. All previous stories deferred Playwright runs to CI.
- `pnpm` install needs `COREPACK_HOME=.corepack` prefix in some sandboxes.
- `tsx` has pipe issues in some sandboxes — use `node --experimental-strip-types` if needed.
- `noUncheckedIndexedAccess` requires non-null assertions in tests (`tasks[0]!.text`).

**Key learnings from 1.5:**

- Mixing Solid reactive text (`{props.task.text}` as JSX child) with imperative DOM mutations (`textRef.textContent = ...`) caused test failures. Story 1.5 fixed this via `createRenderEffect` for text sync. **Do not regress** — `commitEdit` reads `textRef?.textContent` and the imperative-sync pattern stays.
- `setIsEditing(false)` MUST be the LAST action in `commitEdit` (Story 1.5 review patch). Adding the `pushUndo` call in Task 3.6 / 3.7 places it BEFORE `setIsEditing(false)`. Verify this order.
- Reactive conditional event handlers (`onKeyDown={isEditing() ? handler : undefined}`) caused jsdom Solid event-delegation bugs in 1.5. Use unconditional binding + internal `if (!isEditing()) return;` checks. Apply the same discipline to Task 3 — bind `pushUndo`-aware handlers unconditionally; gate on internal state only.

**Bundle size from 1.5:** JS: 8.72 KB gzip, CSS: 2.18 KB gzip = ~10.9 KB total. Story 1.6 target: ≤ +1KB JS gzipped (small typed union, push/pop/apply, single window listener).

### Git Intelligence — recent commits

```
c87e8d7 feat(1.5): complete code review with 9 patches and defer 1 item
850112a feat: complete story 1.4 review and initialize story 1.5
789954e feat: complete code review for stories 1-2 and 1-3
1ea97a9 feat: add story 1.3 task capture loop and empty state implementation
cd52139 feat: complete design tokens, theme bootstrap, and typography system
```

Commit-message style: imperative mood, conventional-commits prefix (`feat:`, `feat(web):`, `feat(N.M):`). Suggested title for the 1.6 implementation commit: `feat(1.6): add session-long undo stack with reversibility coverage`. Suggested title for the review-patch commit: `feat(1.6): complete code review with N patches`.

### Latency budget reminder

NFR-Perf-1 (<16ms p95 keystroke-to-render) applies to the `u` keystroke. The window listener fires synchronously; `applyUndo` reads the last entry, pops it, and applies a single `setStore` call. This is one synchronous tick — well within budget. No async / no microtask hops.

NFR-Perf-2 (<50ms p95 completion-to-strikethrough) — undo of completion toggles `data-completed` via `setTaskCompletedAt`. The CSS strike-through follows `data-completed`. Sub-frame; identical perf characteristics to a forward toggle.

NFR9 (latency under reduced-motion) — undo has no animation, so reduced-motion is identical to standard motion. Confirmed.

### Self-honesty / anti-feature compliance

Per UX spec line 1129: "Pattern: undo-as-the-confirmation. Destructive actions execute immediately with no confirmation prompt. The session-long undo stack is the safety net. `u` reverses the last destructive action with exact-state restoration." This story IS that safety net. The product's commitment to "no modal dialogs, no confirmations" (FR35) is only credible because undo exists. Do not weaken this story's scope.

Specifically forbidden additions (would silently re-introduce anti-features):
- "1 item restored" toast on undo (UX spec line 1140 — explicit anti-pattern).
- Undo button in UI chrome (chrome violates the "blank canvas" thesis; only the cursor + tasks are visible).
- Confirmation prompt before destructive action (`confirm(`, `<Modal>`, `<Dialog>` are CI-grep-forbidden).
- Persistence of the undo stack across reload (cross-session undo is Growth — keeping it session-scoped honors PRD § Growth boundary).

### Project Context Reference

- PRD: FR12 (session-long undo for all destructive ops), FR13 (exact-state restoration on undo), FR28 (no spinner/saving), FR30 (no success indicator), FR35 (no modal dialogs), NFR-Rel-3 (100% reversibility coverage), NFR-Maint-1 (property-based on destructive ops — long-term target).
- Architecture: `architecture.md` § Communication Patterns line 471–480 (undo stack design); § Pattern Examples line 577 (`pushUndo` shape); § Project Structure line 644–645 (`store/undo-stack.ts` location); § FR Coverage line 792 (FR6–13 maps to `<TaskRow>` + `task-store` + `undo-stack`).
- UX spec: Journey 2 (Delete + Undo) lines 610–636; Journey 5 step "Edit recorded in undo stack" line 709; Journey Patterns 1 + 6 (capture-line focus stickiness, "undo via the same primitive across all flows") lines 755–760; Destructive-Action Pattern lines 1125–1142 (`undo-as-the-confirmation`, explicit anti-pattern: "1 item restored" toast).
- Epics: Story 1.6 acceptance criteria; UX-DR18 (session-long undo stack design).
- Previous story: `1-5-task-edit-and-delete.md` (snapshot capture pattern, `getTaskById` returning clone, `setIsEditing` ordering, IME guard, store conventions, bundle size, sandbox quirks).

### References

- [Source: epics.md#Story 1.6] — acceptance criteria source.
- [Source: epics.md#FR12] — session-long undo for all destructive ops.
- [Source: epics.md#FR13] — exact-state restoration on undo.
- [Source: epics.md#FR30] — no success indicator on routine actions.
- [Source: epics.md#FR35] — no modal dialogs for primary task ops.
- [Source: epics.md#UX-DR18] — session-long undo stack design (LIFO; `{ inverseMutation, timestamp }`).
- [Source: epics.md#NFR11] — sync invariants (Rel-2; constrains 1.9 wiring).
- [Source: epics.md#NFR12] — reversibility tests (Rel-3; AC#9 source).
- [Source: ux-design-specification.md#Journey 2] — Delete + Undo flow, mechanics, edge cases (lines 610–636).
- [Source: ux-design-specification.md#Journey 5] — Edit recorded in undo stack (line 709).
- [Source: ux-design-specification.md#Journey Patterns] — capture-line focus stickiness (1), reversibility-via-same-primitive (6) (lines 755–760).
- [Source: ux-design-specification.md#Destructive-Action Pattern] — undo-as-the-confirmation; explicit no-toast anti-pattern (lines 1125–1142).
- [Source: architecture.md#Communication Patterns] — undo stack as a separate store (line 474); `applyMutation` single entry point (line 480).
- [Source: architecture.md#Pattern Examples] — `pushUndo({ inverseMutation: { type: 'delete', id } })` shape (line 577).
- [Source: architecture.md#Project Structure] — `store/undo-stack.ts` location (line 644–645).
- [Source: architecture.md#FR Coverage Map] — FR6–13 (lifecycle, undo) → `<TaskRow>`, `task-store`, `undo-stack` (line 792).
- [Source: architecture.md#Implementation Patterns] — naming, module boundaries, store update patterns.
- [Source: 1-5-task-edit-and-delete.md] — snapshot capture pattern; `getTaskById` clone; `setIsEditing` ordering; IME guard; bundle size; sandbox quirks; the four `// 1.6:` placeholder comments to be replaced.

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming): MATCHES architecture.md § Project Structure line 644–645 exactly. `apps/web/src/store/undo-stack.ts` and co-located test are the canonical locations.
- Detected conflicts or variances: NONE in this story.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — clean implementation with no debug cycles needed.

### Completion Notes List

- Task 1: Created `undo-stack.ts` with `InverseMutation` discriminated union (insert/updateText/setCompletedAt), `UndoEntry` type, `createStore<UndoEntry[]>`, and encapsulated `pushUndo`/`popUndo`/`applyInverseMutation`/`applyUndo`/`clearUndoStack` exports.
- Task 2: Added `setTaskCompletedAt(id, value)` exact-set primitive to `task-store.ts` — distinct from `toggleTaskCompleted` to preserve exact timestamps on undo. 4 new tests (30 total task-store tests).
- Task 3: Wired `pushUndo` at all 6 destructive call sites in TaskRow: toggle-complete via keystroke (x/X), row click, checkbox onChange; delete via keystroke (d/D); edit-text commit; whitespace-only delete. Replaced all four `// 1.6:` placeholder comments from Story 1.5. Cancel-edit correctly pushes nothing.
- Task 4: Added window-level `u`/`U` keydown listener in `App.tsx` with `isEditableTarget` guard (INPUT/TEXTAREA/contentEditable), modifier-key guard, and IME composing guard. Uses `onMount`/`onCleanup` for proper lifecycle.
- Task 5: 15 undo-stack unit tests (mechanics + 4 reversibility + multi-step LIFO + empty-stack no-op), 9 new TaskRow undo-push tests (30 total), 5 App global handler tests. All 129 tests pass.
- Task 6: Wired undo half of `j2-delete-undo.spec.ts` (3 new tests: undo restore, empty-stack no-op, LIFO multi-undo). Created `j6-undo-edit.spec.ts` (2 tests) and `j7-undo-completion.spec.ts` (2 tests). E2E runs deferred to CI per sandbox limitation (consistent with Stories 1.1–1.5).
- Task 7: All gates pass — typecheck clean, lint clean, anti-features passed, 129/129 unit tests pass, build succeeds at 9.26 KB JS gzip (+0.54 KB, well under +1KB ceiling and 50KB NFR6 ceiling).

### Change Log

- 2026-04-28: Implemented session-long undo stack with full reversibility coverage for all destructive operations (complete, uncomplete, edit, delete). Added 33 new unit tests and 7 E2E specs.

### File List

- apps/web/src/store/undo-stack.ts (NEW)
- apps/web/src/store/undo-stack.test.ts (NEW)
- apps/web/src/store/task-store.ts (MODIFIED — added setTaskCompletedAt)
- apps/web/src/store/task-store.test.ts (MODIFIED — added setTaskCompletedAt tests)
- apps/web/src/components/TaskRow.tsx (MODIFIED — wired pushUndo at all destructive call sites)
- apps/web/src/components/TaskRow.test.tsx (MODIFIED — added undo-push tests)
- apps/web/src/components/App.tsx (MODIFIED — added window-level u/U keydown listener)
- apps/web/src/components/App.test.tsx (NEW)
- tests/e2e/j2-delete-undo.spec.ts (MODIFIED — wired undo tests)
- tests/e2e/j6-undo-edit.spec.ts (NEW)
- tests/e2e/j7-undo-completion.spec.ts (NEW)
