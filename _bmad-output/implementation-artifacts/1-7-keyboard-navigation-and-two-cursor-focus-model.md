# Story 1.7: Keyboard Navigation and Two-Cursor Focus Model

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Sam,
I want to navigate and operate every task action from the keyboard alone, with a clear visual focus ring,
so that I never need to reach for the mouse to manage my tasks.

## Acceptance Criteria

1. **Given** the app is open, **When** Sam presses `J` or `ArrowDown`, **Then** list focus moves to the next task down (advances the focus-store index and DOM focus to the corresponding `<li>`). When list focus is at `null` and at least one task exists, the first press lands on index `0`.

2. **Given** the app is open, **When** Sam presses `K` or `ArrowUp`, **Then** list focus moves to the next task up. At index `0`, `K`/`ArrowUp` is a no-op (does not wrap).

3. **Given** list focus is on a task, **When** Sam presses `X`, `E`, `D`, or `U`, **Then** the respective operation (toggle complete, edit, delete, undo) executes against the focused row and pushes the appropriate inverse mutation onto the undo stack (except `U`, which pops it).

4. **Given** the app is open, **When** Sam presses `N` or `Cmd+Enter` (or `Ctrl+Enter` on non-mac), **Then** CaptureLine receives DOM focus; list focus index is cleared to `null` (the focus ring leaves the list).

5. **Given** CaptureLine is focused, **When** Sam presses `X`, `U`, `J`, `K`, `D`, or `E` (without modifiers), **Then** focus does not move away from CaptureLine and no command fires — the keystroke is typed into the input as a regular character (capture-line focus stickiness).

6. **Given** list focus is on a task and the CaptureLine has typed text with a caret position,
   **When** Sam toggles completion on the focused row,
   **Then** the CaptureLine's `value` and `selectionStart`/`selectionEnd` are unaffected (two cursors are independent — a separate test asserts both are preserved across the operation).

7. **Given** any interactive element receives focus via keyboard,
   **Then** a 2px solid `--color-accent` outline with 4px offset and border-radius 2px appears via `:focus-visible` only (not `:focus` alone); the ring uses `outline` (not `box-shadow`) so it survives `forced-colors` mode.

8. **And** `<TaskList>` uses roving tabindex: the row whose index matches `focusedRowIndex()` has `tabindex="0"` (and `data-focused="true"`); all other rows have `tabindex="-1"` (and `data-focused="false"`). Tab from CaptureLine reaches the currently-focused row only.

9. **And** when the focused row is deleted via `D`, focus is adjusted automatically: if the list is now empty, `focusedRowIndex` becomes `null`; otherwise it stays at the same index (revealing the next task that slid up) clamped to `tasks.length - 1`.

10. **And** when `E` activates edit mode, DOM focus moves into the row's `contenteditable` span; on commit (`Enter` / focusout) or cancel (`Escape`), DOM focus returns to the row's `<li>` (so subsequent `j`/`k`/`x`/`d` continue to work without re-navigating).

11. **And** a Playwright keyboard-only end-to-end test (`tests/e2e/keyboard-only.spec.ts`) completes Journey 1 (add task), Journey 2 (delete + undo), and Journey 5 (inline edit) with **zero pointer events** — `page.mouse`, `.click()`, `.tap()`, and `page.touchscreen` are not called anywhere in the spec. Failure of any flow without a pointer fails the build (NFR-A11y-3).

## Tasks / Subtasks

- [x] Task 1: Create `store/focus-store.ts` with focused-row index, editing-task id, capture-input ref, and helper functions (AC: #1, #2, #4, #8, #9, #10)
  - [x] 1.1 New file `apps/web/src/store/focus-store.ts`. Use `createSignal` (not `createStore`) for each piece of state — these are scalar reactive values, exactly what architecture.md line 280 prescribes ("`createSignal` for individual reactive values (e.g., theme, focused-row index)").
  - [x] 1.2 Define and export the three signals as `[getter, setter]` tuples — but DO NOT export the raw setters. Wrap them in named functions so callers cannot bypass invariants (mirrors the `pushUndo`/`popUndo` encapsulation in `undo-stack.ts`):

    ```ts
    import { createSignal } from "solid-js";

    const [focusedRowIndexSignal, setFocusedRowIndexInternal] = createSignal<number | null>(null);
    const [editingTaskIdSignal, setEditingTaskIdInternal] = createSignal<string | null>(null);
    const [captureInputRefSignal, setCaptureInputRefInternal] =
      createSignal<HTMLInputElement | null>(null);

    export const focusedRowIndex = focusedRowIndexSignal;
    export const editingTaskId = editingTaskIdSignal;
    export const captureInputRef = captureInputRefSignal;
    ```

  - [x] 1.3 Export navigation helpers (consume `tasks.length` from `task-store` to clamp):

    ```ts
    import { tasks } from "./task-store";

    export function focusNextRow(): void {
      if (tasks.length === 0) return;
      const current = focusedRowIndexSignal();
      if (current === null) {
        setFocusedRowIndexInternal(0);
        return;
      }
      const next = current + 1;
      if (next < tasks.length) setFocusedRowIndexInternal(next);
    }

    export function focusPrevRow(): void {
      const current = focusedRowIndexSignal();
      if (current === null) {
        if (tasks.length > 0) setFocusedRowIndexInternal(0); // first K from null → row 0 (per AC#2 spec parity with J)
        return;
      }
      if (current > 0) setFocusedRowIndexInternal(current - 1);
    }
    ```

    The "first K from null lands on row 0" rule comes from architecture.md line 824: "First `j` press focuses the first task; first `k` press from no-focus also focuses the first task."

  - [x] 1.4 Export `clearRowFocus()` and `setRowFocus(index: number | null)` for direct manipulation (used by `D` deletion-cleanup and by tests). `setRowFocus` accepts `null` or a clamped index.
  - [x] 1.5 Export `setEditingTask(id: string | null)` — the only setter for the editing signal. Clearing edit (passing `null`) is called by TaskRow's `commitEdit`/`cancelEdit`.
  - [x] 1.6 Export `setCaptureInputRef(el: HTMLInputElement | null)` — called once by `<CaptureLine>` `onMount`, cleared on cleanup. Storing a DOM ref inside `store/` is unusual but does NOT violate `import/no-restricted-paths` (the store does not import from `components/`; the component writes to the store, never the reverse).
  - [x] 1.7 Export `focusCaptureLine()` — clears row focus AND calls `.focus()` on the captured input ref. Used by App's `n` / `Cmd+Enter` handlers AND by TaskRow's `commitEdit`/`cancelEdit` (when edit ends, focus returns to the row, NOT to capture line — so `commitEdit` does NOT call `focusCaptureLine`; see Task 4 for return-to-row pattern).
  - [x] 1.8 Export `clearAllFocus()` — sets all three signals back to defaults. Used by tests in `beforeEach` for isolation.
  - [x] 1.9 Module-boundary check: `focus-store.ts` lives in `store/` and may import from `task-store` (sibling, allowed). It MUST NOT import from `components/`. Verified by `eslint.config.js`'s `import/no-restricted-paths`.

- [x] Task 2: Refactor `TaskList.tsx` to wire roving tabindex via index prop and DOM-focus effect (AC: #1, #2, #8, #10)
  - [x] 2.1 Modify the `<For>` callback to pass the row index to `<TaskRow>`:
    ```tsx
    <For each={tasks}>{(task, index) => <TaskRow task={task} index={index()} />}</For>
    ```
    Solid's `<For>` second-argument is a reactive accessor; `index()` reads the current index. This is the canonical Solid pattern (do NOT use `tasks.indexOf(task)` — O(n) per row, breaks fine-grained reactivity).
  - [x] 2.2 Do NOT add the focus-applying `createEffect` here. Adding it inside `<TaskList>` would re-fire on every store mutation; instead, scope it inside each `<TaskRow>` (Task 3.4) so only the row whose index matches gets `.focus()`.
  - [x] 2.3 Existing `TaskList.test.tsx` (2 tests: empty + newest-first ordering) MUST continue to pass. Add 2 new tests (Task 5.2): roving tabindex matches `focusedRowIndex` signal; index changes propagate to TaskRow's `tabindex` attribute reactively.

- [x] Task 3: Refactor `TaskRow.tsx` — add `index` prop, roving tabindex, edit driven by store, remove per-row keystroke handler (AC: #3, #7, #8, #10)
  - [x] 3.1 Add `index: number` to props: `export function TaskRow(props: { task: ActiveTask; index: number })`. Solid props are reactive accessors — `props.index` reads the current index reactively. Do NOT destructure (Solid props rule from previous stories).
  - [x] 3.2 Replace local `isEditing` signal with derived editing state from the store:
    ```ts
    import {
      editingTaskId,
      setEditingTask,
      focusedRowIndex,
      setRowFocus,
    } from "../store/focus-store";
    const isEditing = () => editingTaskId() === props.task.id;
    ```
    Remove `const [isEditing, setIsEditing] = createSignal(false);` and all `setIsEditing(...)` calls — replace with `setEditingTask(props.task.id)` (enter) and `setEditingTask(null)` (exit).
  - [x] 3.3 Capture an `<li>` ref (`let liRef: HTMLLIElement | undefined;`) for two purposes: (a) DOM-focusing the row when it becomes the focused index, (b) returning DOM focus to the row when edit mode ends.
  - [x] 3.4 Add a `createEffect` that re-applies DOM focus when this row becomes the focused index:
    ```ts
    import { createEffect } from "solid-js";
    createEffect(() => {
      if (focusedRowIndex() === props.index && !isEditing() && liRef) {
        liRef.focus();
      }
    });
    ```
    Why inside TaskRow and not TaskList: only the row whose index matches needs to react; cross-row effects in `<TaskList>` would re-run for every list mutation. Solid's per-row reactivity scopes this naturally.
    Subtle: do NOT call `liRef.focus()` while `isEditing()` is true — it would yank focus out of the contenteditable span mid-edit. The `!isEditing()` guard handles this AND the return-to-row pattern in Task 3.7 (when `setEditingTask(null)` fires, the effect re-runs and focuses the li).
  - [x] 3.5 Render `tabindex` and `data-focused` reactively:
    ```tsx
    <li
      ref={liRef}
      class="task-row"
      data-completed={props.task.completedAt !== null ? "true" : "false"}
      data-focused={focusedRowIndex() === props.index ? "true" : "false"}
      tabindex={focusedRowIndex() === props.index ? 0 : -1}
      onClick={handleRowClick}
      onFocus={handleRowFocus}
      ...
    >
    ```
    Drop the existing `tabindex={0}` literal. Drop `onKeyDown={handleRowKeyDown}` entirely (Task 3.10).
  - [x] 3.6 Add `handleRowFocus` to sync DOM focus events into the focus-store (covers mouse-click-to-focus and Tab navigation):
    ```ts
    function handleRowFocus() {
      if (isEditing()) return;
      if (focusedRowIndex() !== props.index) setRowFocus(props.index);
    }
    ```
    The guard prevents an infinite ping-pong: `setRowFocus` triggers the effect in 3.4, which calls `liRef.focus()`, which re-fires `onFocus` — without the equality check, this would loop. With the check, the second invocation is a no-op.
  - [x] 3.7 Modify `commitEdit` and `cancelEdit` to set `editingTaskId` to `null` (instead of `setIsEditing(false)`). After clearing, ensure `focusedRowIndex` still equals `props.index` so the effect in 3.4 re-focuses the li. The effect handles return-to-row automatically; do NOT call `liRef?.focus()` directly here (the effect is the single source of truth for DOM focus on the li).
  - [x] 3.8 Modify `enterEditMode` to call `setEditingTask(props.task.id)` instead of the local signal setter. Capture `originalText = props.task.text` BEFORE the setter call (the existing pattern is correct). The `queueMicrotask` block that focuses the contenteditable span and places the cursor at end stays unchanged — it runs after `editingTaskId` updates.
  - [x] 3.9 Add a guard at the top of `enterEditMode`: `if (editingTaskId() !== null && editingTaskId() !== props.task.id) return;`. Prevents two rows from entering edit at the same time if a stray `e` fires while another row is editing.
  - [x] 3.10 **Delete the entire `handleRowKeyDown` function** and remove `onKeyDown={handleRowKeyDown}` from the `<li>` JSX. The global handler in `<App>` (Task 4) owns `x`/`e`/`d`/`u` for the focused row. Removing the row-level handler is mandatory — leaving it in place causes double-fire (both row handler and window handler trigger on the same keystroke during DOM bubbling). This is the lift-and-shift Story 1.6 anticipated (Story 1.6 Dev Notes: "Story 1.7's lift will be: copy each per-row handler's logic into App's global handler... but the `pushUndo` call shape remains identical").
  - [x] 3.11 KEEP `handleRowClick` exactly as it is — mouse/touch parity (FR34) is preserved by leaving click handlers in TaskRow. Click-to-toggle and click-to-edit-text continue to work for pointer users. The undo-push call sites inside `handleRowClick` STAY (they are the click pathway; the keyboard pathway is now in App).
  - [x] 3.12 KEEP `handleCheckboxChange` exactly as it is — checkbox onChange is a non-keyboard mutation that still pushes undo.
  - [x] 3.13 Verify `event.isComposing` guard remains in `handleEditKeyDown` (Story 1.5 / 1.6 IME-safety). No regression.

- [x] Task 4: Rewrite `App.tsx` global keyboard handler — add `n`, `Cmd+Enter`, `j`/`k`/`ArrowDown`/`ArrowUp`, `x`, `e`, `d` (AC: #1, #2, #3, #4, #5, #9)
  - [x] 4.1 Add imports:
    ```ts
    import {
      focusedRowIndex,
      focusNextRow,
      focusPrevRow,
      setRowFocus,
      clearRowFocus,
      setEditingTask,
      focusCaptureLine,
    } from "../store/focus-store";
    import { tasks, toggleTaskCompleted, deleteTask, getTaskById } from "../store/task-store";
    import { pushUndo } from "../store/undo-stack";
    ```
  - [x] 4.2 Replace the existing 1.6 `u`-only handler with a comprehensive switch. Order of guards (CRITICAL — wrong order breaks AC#4 or AC#5):

    ```ts
    onMount(() => {
      const handler = (event: KeyboardEvent) => {
        if (event.isComposing) return;

        // Cmd+Enter / Ctrl+Enter focuses capture line — works EVEN from inside the capture line
        // (no-op when already focused) and EVEN from inside an editable element. Therefore this
        // check must come BEFORE the isEditableTarget guard.
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          focusCaptureLine();
          return;
        }

        // All other shortcuts: skip when target is an input/textarea/contenteditable.
        // This is the load-bearing capture-line stickiness rule (AC#5).
        if (isEditableTarget(event.target)) return;
        if (event.metaKey || event.ctrlKey || event.altKey) return;

        switch (event.key) {
          case "u":
          case "U":
            event.preventDefault();
            applyUndo();
            return;

          case "n":
          case "N":
            event.preventDefault();
            focusCaptureLine();
            return;

          case "j":
          case "J":
          case "ArrowDown":
            event.preventDefault();
            focusNextRow();
            return;

          case "k":
          case "K":
          case "ArrowUp":
            event.preventDefault();
            focusPrevRow();
            return;

          case "x":
          case "X": {
            const idx = focusedRowIndex();
            if (idx === null) return;
            const task = tasks[idx];
            if (!task) return;
            event.preventDefault();
            const previousCompletedAt = task.completedAt;
            toggleTaskCompleted(task.id);
            pushUndo({
              inverseMutation: { type: "setCompletedAt", id: task.id, previousCompletedAt },
            });
            return;
          }

          case "e":
          case "E": {
            const idx = focusedRowIndex();
            if (idx === null) return;
            const task = tasks[idx];
            if (!task) return;
            event.preventDefault();
            setEditingTask(task.id);
            return;
          }

          case "d":
          case "D": {
            const idx = focusedRowIndex();
            if (idx === null) return;
            const task = tasks[idx];
            if (!task) return;
            event.preventDefault();
            const snapshot = getTaskById(task.id);
            if (!snapshot) return;
            deleteTask(task.id);
            pushUndo({ inverseMutation: { type: "insert", task: snapshot, index: idx } });
            // AC#9: adjust focus after deletion
            const newLen = tasks.length;
            if (newLen === 0) clearRowFocus();
            else if (idx >= newLen) setRowFocus(newLen - 1);
            // else: focusedRowIndex unchanged — the next task slid up into this slot
            return;
          }
        }
      };
      window.addEventListener("keydown", handler);
      onCleanup(() => window.removeEventListener("keydown", handler));
    });
    ```

  - [x] 4.3 Keep `isEditableTarget(target)` as defined in Story 1.6 (`INPUT`, `TEXTAREA`, `isContentEditable`). This is the same guard — do NOT duplicate it; it stays inline at top of file.
  - [x] 4.4 The `Cmd+Enter` branch fires BEFORE `isEditableTarget` check because the user must be able to press `Cmd+Enter` while typing in `<CaptureLine>` to commit + return-focus pattern… wait, that is NOT the AC. Re-reading AC#4: "Sam presses N or Cmd+Enter, Then CaptureLine receives focus." This works regardless of current focus. The user might be on a row and press Cmd+Enter → focus moves to capture line. Or they might be in capture line and press Cmd+Enter — no-op (already focused). Either way the order shown above is correct: `Cmd+Enter` is processed before the editable-target guard.
  - [x] 4.5 The `Cmd+Enter` branch must NOT clash with `<CaptureLine>`'s plain-`Enter` commit handler. CaptureLine's `handleKeyDown` already returns early on `event.metaKey || event.ctrlKey` (verify Story 1.3 implementation — see code at `apps/web/src/components/CaptureLine.tsx:13-28`; if not present, ADD `if (event.metaKey || event.ctrlKey) return;` at the top of CaptureLine's `handleKeyDown` to prevent committing an empty / partial task on Cmd+Enter).
  - [x] 4.6 IMPORTANT — Why `Cmd+Enter` is BEFORE the `event.metaKey || event.ctrlKey || event.altKey` skip: that skip is a defensive guard against browser shortcuts (Cmd+R reload, Cmd+Z native-undo, etc.) interfering with our single-letter shortcuts. `Cmd+Enter` is OUR shortcut (FR3, UX line 798), so it must be allowed before the skip. Follow this ordering exactly.
  - [x] 4.7 The `n` shortcut works while a row is focused (returns to capture line). When CaptureLine is already focused, `n` is typed into the input (because `isEditableTarget` skips the global handler) — capture-line stickiness preserved. Verified by AC#5 test (Task 5.5).
  - [x] 4.8 The `applyUndo` branch retains its existing behavior (Story 1.6). NO change to undo semantics.
  - [x] 4.9 The `D` deletion-cleanup logic (AC#9): after `deleteTask`, the SAME `idx` value either points to the next task (if there was one after the deleted task — common case; the next-newer task slid up) OR is out-of-bounds (deleted the bottom row). Test all three states in 5.5: middle row, last row, only row. Solid's reactive read of `tasks.length` after `deleteTask` is synchronous — `tasks.length` reflects post-delete state on the next line.

- [x] Task 5: Modify `<CaptureLine>` to register input ref with focus-store and absorb `Cmd+Enter` no-op (AC: #4)
  - [x] 5.1 Import `setCaptureInputRef` from `../store/focus-store`. In `onMount`, after the existing auto-focus logic, call `setCaptureInputRef(inputEl ?? null)`. Add `onCleanup(() => setCaptureInputRef(null))` to clear the reference on unmount.
  - [x] 5.2 In `handleKeyDown`, add at the very top: `if (event.metaKey || event.ctrlKey) return;`. This prevents `Cmd+Enter` (handled by App at AC#4) from also triggering CaptureLine's own `Enter` commit. Without this, pressing `Cmd+Enter` while CaptureLine has typed text would create a task AND focus capture line — double-fire. The App-level handler is the canonical owner of `Cmd+Enter`; CaptureLine yields modifier-Enter combinations to it.
  - [x] 5.3 Existing CaptureLine behavior (auto-focus on desktop only via `matchMedia`, `Enter` to commit, `Escape` to clear) MUST be preserved. The new `metaKey/ctrlKey` early-return is an addition, not a replacement.
  - [x] 5.4 No CSS change required. CaptureLine already has `.capture-line:focus-visible { outline: 2px solid var(--color-accent); ... }` (globals.css:106-110) per AC#7.
  - [x] 5.5 Verify with the existing 4 CaptureLine tests + add 1 new test (Task 5.6): `Cmd+Enter` while typing does NOT create a task.

- [x] Task 6: Unit tests for focus-store, TaskList roving tabindex, TaskRow refactor, App global handler (AC: all)
  - [x] 6.1 Create `apps/web/src/store/focus-store.test.ts`. `beforeEach`: call `clearAllTasks()` and `clearAllFocus()`. Tests:
    - Initial state: `focusedRowIndex() === null`, `editingTaskId() === null`, `captureInputRef() === null`.
    - `focusNextRow()` with empty tasks → no change (still null).
    - `focusNextRow()` with 3 tasks, from null → index 0.
    - `focusNextRow()` with 3 tasks, from 0 → 1; from 1 → 2; from 2 → 2 (clamps, no wrap).
    - `focusPrevRow()` from null with tasks → 0 (per architecture line 824).
    - `focusPrevRow()` from null with empty tasks → no change.
    - `focusPrevRow()` from 2 → 1; from 1 → 0; from 0 → 0 (clamps).
    - `setRowFocus(5)` clamps to `tasks.length - 1` when out of bounds (or accepts and we let App clear it — choose ONE; recommend NO clamping inside the setter, validate at call sites; document the chosen contract in test).
    - `setEditingTask("abc")` → `editingTaskId() === "abc"`. Pass `null` → cleared.
    - `setCaptureInputRef(el)` → `captureInputRef() === el`. Pass `null` → cleared.
    - `focusCaptureLine()` clears `focusedRowIndex` AND calls `.focus()` on the registered input. Mock with a fake `HTMLInputElement` (`{ focus: vi.fn() }` cast).
    - `clearAllFocus()` resets all three signals to defaults.
  - [x] 6.2 Extend `TaskList.test.tsx` with 2 new tests (existing 2 must pass):
    - With 3 tasks and `setRowFocus(1)`: the second `<li>` has `tabindex="0"`, others `tabindex="-1"`, and `data-focused="true"` only on index 1.
    - Updating `setRowFocus(2)` reactively shifts `tabindex="0"` to the third row (no full re-render).
  - [x] 6.3 Extend `TaskRow.test.tsx`. ALL 30 existing tests must continue to pass — the `e` and `d` keystroke tests in the `delete by keystroke` and `edit mode` blocks now exercise the App-level handler, NOT TaskRow's handler. **You must rewrite those tests** to render `<App>` instead of `<TaskRow>` directly OR move them to `App.test.tsx`. Recommended: move all keystroke-driven tests (x/X, d/D, e, x/X-while-editing, d/d-while-editing) to `App.test.tsx`. TaskRow tests retain only: rendering, click/checkbox handlers, edit-mode lifecycle (click + Enter/Escape/focusout commit), and undo-push assertions for click+checkbox+edit pathways.
  - [x] 6.4 Add to `TaskRow.test.tsx`:
    - Roving tabindex: render `<TaskRow task={t} index={1}>` with `setRowFocus(1)` → `li.tabIndex === 0`; with `setRowFocus(0)` → `li.tabIndex === -1`.
    - `data-focused` reflects the same state.
    - Clicking the row (outside text) calls `setRowFocus(props.index)` via `handleRowFocus` (DOM focus event fires synchronously after click).
    - When `editingTaskId()` is set to this row's id (via `setEditingTask`), the contenteditable attribute appears on `.task-text`.
    - When `setEditingTask(null)` is called, contenteditable is removed AND the li regains DOM focus (verify `document.activeElement === liRef`).
  - [x] 6.5 Extend `App.test.tsx` with the lifted keystroke tests + new shortcuts. Use `render(() => <App />)` and dispatch `KeyboardEvent` on `window` (existing 1.6 pattern). `beforeEach`: `clearAllTasks(); clearUndoStack(); clearAllFocus();`. Tests:
    - **Navigation:** with 3 tasks and no focus, `j` → `focusedRowIndex() === 0`; `j` again → 1; `j` again → 2; `j` again → 2 (no wrap). `k` from 2 → 1; from 1 → 0; from 0 → 0.
    - **ArrowDown / ArrowUp aliases:** identical behavior to `j`/`k`.
    - **`n` focuses CaptureLine:** with a row focused and CaptureLine present, dispatch `n` → `focusedRowIndex() === null` AND `document.activeElement === captureInput`.
    - **`Cmd+Enter` focuses CaptureLine:** same as `n` test, with `metaKey: true, key: "Enter"`.
    - **`Ctrl+Enter` focuses CaptureLine:** non-mac equivalent.
    - **`x` toggles focused row:** with `setRowFocus(0)`, dispatch `x` → `tasks[0].completedAt` is a number; undo entry pushed.
    - **`x` does nothing when no row focused:** `focusedRowIndex() === null`, dispatch `x` → no mutation, no undo entry.
    - **`d` deletes focused row:** assert deletion, undo entry, focus adjustment per AC#9 (cover all three: middle, last, only).
    - **`e` enters edit mode on focused row:** `editingTaskId() === task.id`. Dispatch `Escape` → cleared.
    - **Capture-line stickiness:** focus the capture input, type "j" via `input.dispatchEvent(new KeyboardEvent("keydown", {key: "j"}))` — assert `focusedRowIndex()` remains null (the global handler skipped because target was INPUT). Repeat for `x`, `u`, `k`, `d`, `e`.
    - **Two-cursor independence (AC#6):** focus capture line, type "buy oat", set `selectionStart = 3`, then `setRowFocus(0)`; dispatch `x` on the focused row (via window keydown with target = li). Re-focus capture line. Assert `captureInput.value === "buy oat"` AND `captureInput.selectionStart === 3` (caret position preserved across the focus excursion).
    - **Cmd+u (browser back-history) does not trigger undo:** carry-forward from 1.6.
    - **Listener cleaned up on unmount:** carry-forward from 1.6.
    - **Modifier+letter does not steal:** `Cmd+x` (system cut) does not toggle.
  - [x] 6.6 Extend `CaptureLine.test.tsx` with 1 new test: `Cmd+Enter` while typing does NOT call `createTask` (assert `tasks.length` stays 0). Plus assert that on mount, `setCaptureInputRef` was called with the input element (spy via re-export or by reading `captureInputRef()` after render).
  - [x] 6.7 IME guard regression check: the new App handler must include `if (event.isComposing) return;` at the top. Add a test: dispatch `keydown` with `isComposing: true` and `key: "x"` while a row is focused → no toggle, no undo entry.

- [x] Task 7: Playwright keyboard-only E2E spec — Journeys 1, 2, 5 with zero pointer events (AC: #11)
  - [x] 7.1 Create `tests/e2e/keyboard-only.spec.ts`. ESLint or a simple regex grep at the spec level should reject `page.mouse`, `.click(`, `.tap(`, `.hover(`, `page.touchscreen` — for now, simply avoid these APIs in the spec and add a comment block at the top: `// NFR-A11y-3: this spec must use keyboard-only interactions. Do not introduce page.click(), page.tap(), or page.mouse.`
  - [x] 7.2 **Journey 1 (add task) keyboard-only:**

    ```ts
    test("J1 — add three tasks via keyboard alone", async ({ page }) => {
      await page.goto("/");
      // CaptureLine auto-focuses on desktop; type immediately.
      await page.keyboard.type("Buy oat milk");
      await page.keyboard.press("Enter");
      await page.keyboard.type("Walk the dog");
      await page.keyboard.press("Enter");
      await page.keyboard.type("Read for 30 minutes");
      await page.keyboard.press("Enter");

      const items = page.locator("li");
      await expect(items).toHaveCount(3);
      await expect(items.nth(0)).toHaveText("Read for 30 minutes");
      await expect(items.nth(2)).toHaveText("Buy oat milk");
    });
    ```

  - [x] 7.3 **Journey 2 (delete + undo) keyboard-only:**
    ```ts
    test("J2 — delete and undo via j, d, u alone", async ({ page }) => {
      await page.goto("/");
      await page.keyboard.type("Buy bread");
      await page.keyboard.press("Enter");
      // From CaptureLine, press j to navigate into the list (AC#1).
      // NOTE: per capture-line stickiness (AC#5), j typed in the input would type "j" — instead
      // we Tab out first, OR press n then j... actually the simplest path is Tab (browser-native
      // focus advance to the row's tabindex=0 element).
      await page.keyboard.press("Tab");
      await page.keyboard.press("d");
      await expect(page.locator("li")).toHaveCount(0);
      await page.keyboard.press("u");
      await expect(page.locator("li")).toHaveCount(1);
      await expect(page.locator(".task-text").first()).toHaveText("Buy bread");
    });
    ```
    Tab from the capture input lands on the first row (its `tabindex="0"`). The `onFocus` handler (Task 3.6) syncs the focus-store to index 0. Subsequent `d`/`u` operate on the focused row.
  - [x] 7.4 **Journey 5 (inline edit) keyboard-only:**
    ```ts
    test("J5 — edit task text via Tab, e, Enter alone", async ({ page }) => {
      await page.goto("/");
      await page.keyboard.type("Buy oat milk");
      await page.keyboard.press("Enter");
      await page.keyboard.press("Tab"); // focus first row
      await page.keyboard.press("e"); // enter edit mode
      // Select all text in the contenteditable, replace.
      await page.keyboard.press("Control+A"); // or Meta+A on macOS — Playwright maps this
      await page.keyboard.press("Backspace");
      await page.keyboard.type("Buy almond milk");
      await page.keyboard.press("Enter");
      await expect(page.locator(".task-text").first()).toHaveText("Buy almond milk");
    });
    ```
    Note: `Control+A` selects all in most browsers and contenteditable. On macOS-emulated CI, Playwright maps `Control` to `Meta` only when the project's `use.platform` is mac — by default chromium on linux uses Control. Don't hardcode `Meta+A`; use `ControlOrMeta+A` if available, else use Playwright's `selectAll()` workaround (`textSpan.evaluate(el => { const r = document.createRange(); r.selectNodeContents(el); ... })` is NOT keyboard-only — avoid this; stick with `Control+A`).
  - [x] 7.5 **`n` and `Cmd+Enter` keyboard return path:**
    ```ts
    test("n returns focus to capture line from a row", async ({ page }) => {
      await page.goto("/");
      await page.keyboard.type("task one");
      await page.keyboard.press("Enter");
      await page.keyboard.press("Tab");
      await expect(page.locator("li").first()).toBeFocused();
      await page.keyboard.press("n");
      await expect(page.locator('input[aria-label="Add a task"]')).toBeFocused();
    });
    ```
  - [x] 7.6 **Capture-line stickiness end-to-end:**
    ```ts
    test("typing j/k/x/u in capture line types letters, does not navigate", async ({ page }) => {
      await page.goto("/");
      await page.keyboard.type("jkxu");
      await expect(page.locator('input[aria-label="Add a task"]')).toHaveValue("jkxu");
      await expect(page.locator("li")).toHaveCount(0);
    });
    ```
  - [x] 7.7 If the sandbox cannot launch Playwright, commit the spec files and defer the run to CI. Sandbox run is not a release blocker; same convention as Stories 1.1–1.6. The CI gate enforces NFR-A11y-3.

- [x] Task 8: Verify all gates (AC: all)
  - [x] 8.1 `pnpm typecheck` — passes with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. The App `switch` over `event.key` is exhaustive enough; uncovered cases naturally fall through and do nothing. `tasks[idx]` reads must use the non-null assertion or proper null-narrowing because `noUncheckedIndexedAccess` types it as `ActiveTask | undefined`.
  - [x] 8.2 `pnpm lint` — passes. Module boundaries: `store/focus-store.ts` imports only from `store/task-store.ts` and `solid-js`. `components/App.tsx` imports from `store/focus-store.ts`, `store/task-store.ts`, `store/undo-stack.ts`. `components/TaskList.tsx` imports from `store/task-store.ts` only. `components/TaskRow.tsx` imports from `store/focus-store.ts`, `store/task-store.ts`, `store/undo-stack.ts`. `components/CaptureLine.tsx` imports from `store/task-store.ts`, `store/focus-store.ts`. No reverse imports.
  - [x] 8.3 `bash scripts/check-anti-features.sh` — passes. No new toast/modal/dialog/spinner/skeleton/confirm/alert primitives introduced. Focus and navigation are pure mechanical state changes — no chrome.
  - [x] 8.4 `pnpm test` — all unit tests pass. Expected count: 30 task-store + 15+ undo-stack (1.6) + 30 TaskRow (some moved to App) + 5 (1.6) + N new App tests (target ≥18 covering 4.5/AC#1–9 except #11) + 4 (or 5 with Cmd+Enter test) CaptureLine + 2 + 2 new TaskList + 12+ new focus-store. Total target ≥150 unit tests passing.
  - [x] 8.5 `pnpm build` — succeeds. Bundle delta target: ≤+1.5KB JS gzipped (focus-store ~250B + lifted handler ~700B + TaskRow effect ~150B). Hard ceiling per NFR6: ≤50KB initial JS gzipped — current ~9.26KB after 1.6, target after 1.7 ~10.7KB — still well under. CSS delta: 0 (no new styles; AC#7's focus-ring CSS already exists in globals.css from Story 1.2).
  - [x] 8.6 `pnpm test:e2e` — deferred to CI if sandbox cannot launch (same convention as 1.1–1.6). All four spec files (`keyboard-only.spec.ts` + the existing `j*-*.spec.ts`) MUST be committed.
  - [x] 8.7 Visual regression (deferred to CI / Story 1.12): the focused-row state already has a snapshot in the visual-regression suite from earlier stories; this story adds `data-focused="true"` to the rendered DOM. If snapshots are run locally, regenerate the focused-row snapshot — the visible focus ring is identical (same `:focus-visible` CSS) but the DOM attribute differs.

## Dev Notes

### CRITICAL: Architecture vs Epic Naming (carried forward from 1.2 / 1.3 / 1.4 / 1.5 / 1.6)

The architecture document is the source of truth where it disagrees with the epic file:

1. **Framework: SolidJS, NOT React.** Use Solid's JSX (`class=` not `className=`, `onKeyDown`/`onClick`/`onChange`, `ref={el}` callbacks, `onMount`/`onCleanup`/`createEffect`, `createStore`, `createSignal`, `<Show>`/`<For>`). Never destructure props — `props.task.text` not `const { task } = props`. The `<For>` callback's second argument is a reactive accessor: `(task, index) => ...` and `index()` reads it.
2. **Backend directory: `apps/api`.** Not relevant in this story.
3. **Database: SQLite.** Not relevant in this story (still in-memory).

### Phase placement

Story 1.7 completes **Phase 3 step 9** in the architecture's implementation roadmap (UX spec § Implementation Roadmap item 9: "Keyboard navigation — roving tabindex in `<TaskList>`, `j`/`k` handlers in `<App>`"). It also lifts work from 1.5/1.6's per-row keystroke handlers into the global keyboard model that the architecture has prescribed since the beginning (architecture.md line 798: "App owns global keyboard shortcuts: `n` (focus capture line), `j`/`k` (navigate task list), `x` (toggle complete on focused row), `u` (undo), `e` (edit focused row), `cmd+enter` (cross-tab quick capture — registered via PWA), `cmd+shift+L` (reveal dev latency display)").

`cmd+shift+L` is NOT in this story — it lands in Story 1.11 (`<DevLatencyDisplay>`). This story implements every other shortcut listed.

Out of scope this story (preserved from 1.6):

- IndexedDB / outbox / service worker (Story 1.9).
- Idempotency keys (Story 1.9).
- Annunciator wiring (Story 1.10).
- Theme toggle (Story 1.8) — though `n`-as-shortcut overlap is checked: there is no Story 1.8 keystroke that conflicts with this story's bindings (theme toggle is `t` per UX, not in `n`/`j`/`k`/`x`/`u`/`e`/`d`/`Cmd+Enter`).
- Property-based tests via `fast-check` — deferred to a future story.
- Cross-tab capture via OS-level shortcut — Growth scope per architecture line 1026 ("`cmd+enter` global capture is PWA-scoped, not browser-global"). This story's `Cmd+Enter` binding is intra-app (works inside the app tab/PWA window), which is the v1 reality.

### Architecture Compliance (load-bearing rules)

**Module boundaries (frontend) — enforced by `eslint.config.js`'s `import/no-restricted-paths`:**

- `components/` may import from `store/` and `lib/`. May NOT import from `sync/`.
- `store/` may import from `sync/`. May NOT import from `components/`. ✅ `focus-store.ts` does NOT import from `components/`.
- `sync/` may NOT import from `components/` or `store/`.

This story modifies files in `components/` and `store/`. The new `focus-store ↔ task-store` cross-store import is allowed (both in `store/`).

**Naming conventions:**

- Components: `PascalCase.tsx`. Co-located test: `PascalCase.test.tsx`.
- Non-component modules: `kebab-case.ts`. Co-located test: `kebab-case.test.ts`. ✅ `focus-store.ts` / `focus-store.test.ts`.
- All exports are NAMED exports (`import/no-default-export` is `error`-level).
- Boolean variables: `isFoo` / `hasFoo` / `canFoo` / `shouldFoo`.
- Helper function names: action-verb form (`focusNextRow`, `focusPrevRow`, `clearRowFocus`, `setRowFocus`, `setEditingTask`, `setCaptureInputRef`, `focusCaptureLine`, `clearAllFocus`).

**Reactivity (Solid-idiomatic):**

- `createSignal` for the three focus signals (architecture.md line 280 — "individual reactive values").
- `<For>` with second argument for reactive index access in `<TaskList>`.
- `createEffect` in `<TaskRow>` for the focus-store-index-to-DOM-focus side effect.
- `onMount` / `onCleanup` for the window listener in `<App>` AND for the capture-input-ref registration in `<CaptureLine>`.
- Never call `liRef.focus()` while reactive state is mid-update. The `createEffect` boundary takes care of batching; the `!isEditing()` guard prevents focus theft during edit mode.

**Anti-feature contract (FR46–54, AR18; CI-grep enforced):**

Forbidden in this story (same as 1.5 / 1.6): `toast(`, `Snackbar`, `Toaster`, `Skeleton`, `Spinner`, `confirm(`, `alert(`, `<Modal`, `<Dialog`, `<ErrorBoundary`, `Streak`, `Achievement`, `Karma`, `XP`, emojis 🎉✨🏆.

Specifically for keyboard nav: NO keyboard-shortcut overlay (`?` to show shortcuts) — Growth scope per epics.md Epic 2 ("`?` shortcut overlay"). NO toast on `n` ("returned to capture line") — focus IS the feedback. NO highlight-flash on focus change — focus ring is the only visual indicator. NO sound on navigation — FR52.

### Existing files this story modifies — current state and what must be preserved

**`apps/web/src/components/App.tsx`** (current state at line 1–34, reviewed in full):

```ts
// Existing exports: App
// Existing behavior: registers a window-level "u"/"U" keydown listener via onMount/onCleanup;
// renders <main class="app-main bg-paper text-ink"><CaptureLine /><TaskList /></main>.
// All 5 existing tests in App.test.tsx must continue to pass.
```

What 1.7 changes: REPLACES the `u`-only switch with the comprehensive switch in Task 4. Adds imports for focus-store helpers, `tasks`/store mutators, and `pushUndo`. The `isEditableTarget` helper STAYS unchanged; the order of guards changes (Cmd+Enter check moves above `isEditableTarget` per Task 4.4). The `onMount`/`onCleanup` shape stays.

What must be preserved: `<main class="app-main bg-paper text-ink">` wrapper; the `<CaptureLine />` and `<TaskList />` children; the `isEditableTarget` function definition; the `event.isComposing` guard.

**`apps/web/src/components/TaskList.tsx`** (current state at line 1–11, reviewed in full):

```ts
// Existing: <ul role="list" class="task-list"><For each={tasks}>{task => <TaskRow task={task} />}</For></ul>
// All 2 existing tests must pass.
```

What 1.7 changes: callback signature `(task) => ...` → `(task, index) => <TaskRow task={task} index={index()} />`. Add 2 new tests for roving tabindex.

What must be preserved: `<ul role="list">`; the `class="task-list"` token; the empty-state behavior (zero children when tasks empty).

**`apps/web/src/components/TaskRow.tsx`** (current state at line 1–162, reviewed in full):

What 1.7 changes:

1. Add `index: number` prop (Task 3.1).
2. Replace local `isEditing` signal with derived `editingTaskId() === props.task.id` (Task 3.2).
3. Capture `liRef` (Task 3.3).
4. Add `createEffect` for focus-store-driven DOM focus (Task 3.4).
5. Replace literal `tabindex={0}` with reactive `tabindex={focusedRowIndex() === props.index ? 0 : -1}`; add `data-focused` (Task 3.5).
6. Add `handleRowFocus` to sync DOM focus → focus-store (Task 3.6).
7. Modify `enterEditMode` / `commitEdit` / `cancelEdit` to use `setEditingTask` (Tasks 3.7, 3.8, 3.9).
8. **DELETE `handleRowKeyDown` and remove `onKeyDown` from the `<li>`** (Task 3.10) — this is the lift-and-shift Story 1.6 anticipated.
9. Move keystroke-driven test cases from `TaskRow.test.tsx` to `App.test.tsx` (Task 6.3).

What must be preserved: `placeCursorAtEnd` helper; `createRenderEffect` text-sync (DO NOT REMOVE — 1.5 review patch fixed reactive/imperative-text bug); `<input type="checkbox">` always programmatically present, visually suppressed via `clip-path` from globals.css; `<Tick>` rendered only when completed; `contentEditable={isEditing() ? "plaintext-only" : undefined}`; `event.isComposing` guard in `handleEditKeyDown`; `onClick={(e) => e.stopPropagation()}` on the checkbox; `handleRowClick` undo-push call sites (mouse pathway); `handleCheckboxChange` undo-push (checkbox onChange pathway). The existing Click-related tests should continue to pass; only the keystroke tests move.

**`apps/web/src/components/CaptureLine.tsx`** (current state at line 1–42, reviewed in full):

What 1.7 changes:

1. Register `inputEl` with focus-store on mount (Task 5.1): `setCaptureInputRef(inputEl ?? null)`. Cleanup in `onCleanup`.
2. Add `if (event.metaKey || event.ctrlKey) return;` at the top of `handleKeyDown` (Task 5.2) so `Cmd+Enter` doesn't double-fire.

What must be preserved: uncontrolled input contract (DOM owns text per architecture.md line 287 — load-bearing for NFR-Perf-1); `aria-label="Add a task"`; `autocomplete="off"`; `spellcheck={true}`; `enterkeyhint="done"`; mobile-no-auto-focus (`matchMedia("(max-width: 639px)")`); existing `Enter` (commit + clear + re-focus) and `Escape` (clear) behaviors.

**`apps/web/src/components/Tick.tsx`** — NOT modified. Tick variance and all visual contract from Story 1.4 unchanged.

**`apps/web/src/store/task-store.ts`** — NOT modified. All 30 tests continue to pass.

**`apps/web/src/store/undo-stack.ts`** — NOT modified. The `pushUndo` shape used in App's lifted handlers is identical to the per-row 1.6 shape.

**`apps/web/src/styles/globals.css`** — NOT modified. The required focus ring (`:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 4px; border-radius: 2px; }`) ALREADY EXISTS at lines 106-110 (capture-line) and 128-132 (task-row). Verify these still match AC#7 visually after roving tabindex causes most rows to be `tabindex="-1"`. `:focus-visible` works regardless of tabindex value, so the ring will appear correctly on the focused row.

### Component Implementation Details

**Roving tabindex pattern (AC#8) — exhaustive contract:**

```tsx
// In TaskRow.tsx
<li
  ref={liRef}
  class="task-row"
  data-completed={props.task.completedAt !== null ? "true" : "false"}
  data-focused={focusedRowIndex() === props.index ? "true" : "false"}
  tabindex={focusedRowIndex() === props.index ? 0 : -1}
  onClick={handleRowClick}
  onFocus={handleRowFocus}
>
```

When the user presses `Tab` from `<CaptureLine>`, the browser's native focus advance lands on the FIRST element with `tabindex` ≥ 0 in tab order. Initially `focusedRowIndex() === null`, so ALL rows have `tabindex="-1"` — Tab from CaptureLine would skip them entirely, landing on the next focusable element (which doesn't exist; focus advances to the address bar).

To fix this: when `focusedRowIndex() === null` and a Tab from CaptureLine is detected, we need to land on row 0. Two implementation options:

- **Option A (recommended):** When user presses Tab in CaptureLine and tasks exist, intercept and call `setRowFocus(0)` + `liRef.focus()`. Implement by listening for `Tab` on CaptureLine's keydown handler. Subtle: don't intercept Shift+Tab (let it advance backwards normally, which on first-page is browser-back behavior).
- **Option B (simpler, fully spec-compliant):** Always have row 0 with `tabindex="0"` (default-focused-row pattern). When `focusedRowIndex() === null`, treat row 0 as the default. The `data-focused="true"` only applies when the index is set, so the focus ring still doesn't render until the user actually navigates. — Implementation: `tabindex={focusedRowIndex() === props.index || (focusedRowIndex() === null && props.index === 0) ? 0 : -1}`.

Pick Option B for simplicity. Validate with the Tab test in `tests/e2e/keyboard-only.spec.ts` (Task 7.3): Tab from capture line lands on row 0 → `onFocus` fires → `setRowFocus(0)` is called → focus-store sync.

**Two-cursor independence (AC#6) — DOM-focus reality vs visual narrative:**

The DOM has one focus at a time. The "two cursors" model is preserved by the `<input>`'s native browser behavior: when focus leaves an input, the input's `value` and `selectionStart`/`selectionEnd` are PRESERVED (the browser does not clear them). When focus returns, the caret resumes at the same offset.

Therefore: pressing `j` / `Tab` while `<CaptureLine>` is focused (with typed text and a caret offset) will move DOM focus to row 0; the input's `value` and selection are intact. Pressing `n` returns DOM focus to the input; the caret resumes. The "two cursors" claim is observably true for the user, even though only one DOM focus exists at any instant.

The AC#6 test (Task 6.5, two-cursor independence) asserts this preservation explicitly.

**Capture-line stickiness (AC#5) — single `isEditableTarget` guard:**

The load-bearing guard is in `App.tsx`'s global handler:

```ts
if (isEditableTarget(event.target)) return;
```

When `<CaptureLine>`'s `<input>` has DOM focus, every keystroke routes through it first. The `keydown` event bubbles to window. The handler's `event.target` is the `<input>` (an editable target). The handler returns early — no command fires. The keystroke proceeds with the browser's default action: typing the character.

This is the EXACT same mechanism Story 1.6 used for `u`. We are extending it to all single-letter shortcuts. No new mechanism required.

The ONE exception is `Cmd+Enter` (Task 4.4): it's processed BEFORE the editable-target guard so the user can fire it from inside the capture line. Since `Cmd+Enter` is not a printable character, no double-action concern; CaptureLine's `handleKeyDown` early-returns on `metaKey || ctrlKey` (Task 5.2), so it doesn't also commit.

**Edit-mode lift (Tasks 3.2, 3.7, 3.8, 3.9, 3.10) — store-driven editing:**

Currently `<TaskRow>` owns local `isEditing` signal. After lift:

```ts
// TaskRow.tsx
const isEditing = () => editingTaskId() === props.task.id;

function enterEditMode() {
  if (isEditing()) return;
  if (editingTaskId() !== null) return; // another row is editing — refuse
  originalText = props.task.text;
  setEditingTask(props.task.id);
  queueMicrotask(() => {
    if (textRef) {
      textRef.focus();
      placeCursorAtEnd(textRef);
    }
  });
}

function commitEdit() {
  if (!isEditing()) return;
  // ... existing commit logic ...
  setEditingTask(null); // was setIsEditing(false)
  // No explicit liRef.focus() — the createEffect (Task 3.4) re-runs because isEditing flipped,
  // and it focuses the li. SINGLE source of truth.
}

function cancelEdit() {
  if (textRef) textRef.textContent = originalText;
  setEditingTask(null);
  // Same return-to-row pattern as commitEdit.
}
```

**Critical ordering (commitEdit):** `setEditingTask(null)` MUST be the LAST action in commitEdit (just like `setIsEditing(false)` was in 1.5/1.6). The push-undo calls happen BEFORE clearing edit mode so that if `pushUndo` ever throws, the row is still in edit mode and the user can retry. (1.5 review patch — preserve this property.)

**Focus return after edit (AC#10):**

The `createEffect` in Task 3.4:

```ts
createEffect(() => {
  if (focusedRowIndex() === props.index && !isEditing() && liRef) {
    liRef.focus();
  }
});
```

Walkthrough of the `e` → edit → Enter → commit → return-to-row sequence:

1. App receives `e` keydown. `focusedRowIndex() === N`. App calls `setEditingTask(tasks[N].id)`.
2. TaskRow's `isEditing()` flips to `true`. The `createEffect` re-runs: condition `!isEditing()` is now `false`; effect does nothing.
3. TaskRow's render re-runs: `contentEditable="plaintext-only"` appears on `.task-text`. `enterEditMode`'s `queueMicrotask` block focuses the span and places the cursor.
4. User types "Buy almond milk", presses `Enter`. TaskRow's `handleEditKeyDown` calls `commitEdit`.
5. `commitEdit` runs: text updated, undo pushed, `setEditingTask(null)`.
6. TaskRow's `isEditing()` flips back to `false`. The `createEffect` re-runs: condition `focusedRowIndex() === props.index && !isEditing() && liRef` is now `true`; calls `liRef.focus()`.
7. DOM focus returns to the `<li>`. The user's next `j`/`k`/`d` operates on the focused row.

**Edge case:** if the user clicks (or `n`) away mid-edit, `focusedRowIndex` may have changed. The effect won't focus the li (correct behavior — the user is elsewhere). The contenteditable's blur fires `handleEditFocusOut` → `commitEdit` → `setEditingTask(null)` (existing 1.5 behavior preserved). The text is committed. No focus thrash.

**`D` deletion focus adjustment (AC#9):**

After `deleteTask(task.id)`, the array reactively shrinks. The dispatched `pushUndo` happens before any focus adjustment. Then:

- `tasks.length === 0`: clear focus (`clearRowFocus()`).
- `idx >= tasks.length`: deleted the last row; move focus to the new last row (`setRowFocus(tasks.length - 1)`).
- `idx < tasks.length`: stay at `idx` — the next-newer task slid up into this slot. The `createEffect` in TaskRow does NOT re-focus because the `<li>` at index `idx` is now a different DOM element rendering a different task; Solid's reactive `<For>` re-keys the row. The new li at index `idx` will run its own `createEffect` on first render and call `.focus()` itself.

Test all three cases in Task 6.5 and Task 7 E2E.

**Why `Cmd+Enter` works inside the capture line (Task 4.4):**

UX line 798 specifies `Cmd+Enter` as a global "focus capture line" / "cross-tab quick capture" shortcut. Inside the app, with capture line already focused, pressing `Cmd+Enter` is a no-op (the focus call on an already-focused element is harmless; capture-line caret position is preserved by the browser). Users coming from native apps expect `Cmd+Enter` to commit a draft — but in our app, plain `Enter` already commits, and `Cmd+Enter` is a return-to-capture intent. This is the architecturally-prescribed binding (architecture.md line 798).

Cross-tab native capture is Growth scope (architecture line 1026). v1's `Cmd+Enter` is intra-app only.

### Interaction with Story 1.8 (Theme Toggle, Dark Mode & Accessibility Tokens)

Story 1.8 adds theme-toggle keyboard shortcut (`T` per epic AC; UX spec doesn't bind a letter explicitly — the AC says "keyboard-accessible; T key or focusable button"). 1.7 binds `n`, `j`, `k`, `x`, `e`, `d`, `u` and `Cmd+Enter`. NO conflict with `t`. 1.8 lands `t` in the App-level switch as a new `case "t": case "T":` branch. The `Cmd+Enter` ordering pattern set here will accommodate any future modifier-key shortcuts cleanly.

Story 1.8 also adds capture-line stickiness verification under reduced-motion (`prefers-reduced-motion: reduce`). The current implementation has NO motion on focus changes (the focus ring is a static outline; no transition). Reduced-motion is automatically honored.

### Interaction with Story 1.9 (Cross-Session Persistence and Offline-First Sync)

When 1.9 lands, the focus-store remains unchanged — focus is purely UI state, never persisted. The lifted destructive operations in App.tsx (`x`/`d`/`e`-then-commit) will gain outbox/idempotency wiring inside the store mutators (`toggleTaskCompleted`, `deleteTask`, `updateTaskText`), NOT in App. App's keyboard handler stays a thin dispatcher.

### Interaction with Story 1.10 (Annunciator and Failure Feedback Routing)

If a destructive operation fails (only relevant after 1.9), the failure routes through the Annunciator — NOT a per-row error UI. Story 1.7's lifted handlers do not catch errors; they let store mutators handle failures. No annunciator wiring in 1.7.

### Interaction with Story 1.11 (DevLatencyDisplay)

Story 1.11 adds `Cmd+Shift+L` to toggle a hidden latency overlay. Add as another modifier-key branch in App's switch — same pattern as `Cmd+Enter`. 1.11 will not conflict with any 1.7 binding.

### Interaction with Story 1.12 (CI Performance, Accessibility & Visual-Regression Gates)

This story creates the `tests/e2e/keyboard-only.spec.ts` file (NFR-A11y-3 satisfaction). Story 1.12 wires it as a CI gate alongside axe-core and the bundle/latency budgets. 1.7's spec is the canonical artifact that 1.12 enforces.

### Library / Framework Requirements

| Package    | Version                    | Source   | Why                                                                            |
| ---------- | -------------------------- | -------- | ------------------------------------------------------------------------------ |
| `solid-js` | already installed (^1.9.5) | existing | `createSignal`, `createEffect`, `onMount`, `onCleanup`, `<For>` index accessor |

**No new dependencies in this story.** `KeyboardEvent`, `window.addEventListener`, `document.activeElement`, `HTMLElement.focus()`, `HTMLInputElement.selectionStart`/`selectionEnd` are native browser APIs.

Do NOT install: any keyboard-shortcut library (`mousetrap`, `tinykeys`, `hotkeys-js`) — a single `addEventListener` + `switch` covers our 8 bindings; library overhead would breach NFR-Perf-6's 50KB budget. Any focus-management library (`focus-trap`, `react-aria`) — irrelevant for SolidJS and overkill for v1's tiny surface.

### File Structure Requirements

After this story the modified/new files are:

```
apps/web/src/
├── components/
│   ├── App.tsx                       # MODIFIED — comprehensive global keyboard handler
│   ├── App.test.tsx                  # MODIFIED — absorbs lifted keystroke tests + new shortcuts
│   ├── TaskList.tsx                  # MODIFIED — pass index to TaskRow
│   ├── TaskList.test.tsx             # MODIFIED — add roving-tabindex tests
│   ├── TaskRow.tsx                   # MODIFIED — index prop, store-driven edit, removed handleRowKeyDown
│   ├── TaskRow.test.tsx              # MODIFIED — keystroke tests moved to App.test.tsx
│   ├── CaptureLine.tsx               # MODIFIED — register input ref, ignore modifier-Enter
│   └── CaptureLine.test.tsx          # MODIFIED — add Cmd+Enter no-op + ref registration tests
├── store/
│   ├── focus-store.ts                # NEW — focusedRowIndex, editingTaskId, captureInputRef + helpers
│   └── focus-store.test.ts           # NEW — focus mechanics + clamp/wrap behavior

tests/e2e/
└── keyboard-only.spec.ts             # NEW — NFR-A11y-3 spec; J1, J2, J5 with zero pointer events
```

All other files unchanged. No new component files — keyboard navigation is store + global keystroke + CSS-already-present, no UI surface.

### Testing Requirements

**Unit tests** (Vitest + jsdom + `@solidjs/testing-library`):

- `focus-store.test.ts` — push/clamp/clear mechanics for the three signals; navigation helpers; capture-input-ref registration.
- `TaskList.test.tsx` — roving tabindex propagates from `focusedRowIndex` to row attributes; existing 2 tests must continue to pass.
- `TaskRow.test.tsx` — refactored. Roving tabindex / `data-focused` attributes. Click + checkbox + edit-mode lifecycle (kept). Keystroke tests REMOVED (moved to App.test.tsx).
- `App.test.tsx` — comprehensive global keyboard model: `n`, `Cmd+Enter`, `j`/`k`/`ArrowDown`/`ArrowUp`, `x`, `e`, `d`, `u`. Capture-line stickiness verified for every shortcut. Two-cursor preservation (AC#6). Focus adjustment after delete (AC#9). IME guard. Listener cleanup.
- `CaptureLine.test.tsx` — existing 4 tests must pass; add 1 test for `Cmd+Enter` no-op; add 1 test for input ref registration.

**E2E tests** (Playwright):

- `keyboard-only.spec.ts` — NFR-A11y-3: J1 add, J2 delete + undo, J5 inline edit; `n` returns to capture; capture-line stickiness via typing letters that are also shortcuts. ZERO pointer events.

**Out of scope this story:**

- Theme toggle keyboard shortcut — Story 1.8.
- Dev-mode latency overlay (`Cmd+Shift+L`) — Story 1.11.
- `cmd+shift+L` global handler — Story 1.11.
- Cross-tab native shortcut (true global capture) — Growth scope per architecture amendment.
- `?` shortcut overlay — Growth scope (epics.md Epic 2).
- Mobile-tuned touch gestures — Story 1.8 (touch target sizing) and Growth scope (swipe / haptic).
- Focus persistence across reload — not a v1 concern; focus is session-only.
- Property-based tests for navigation — deferred to future story.

### Previous Story Intelligence (Story 1.6)

**Things that worked and we should keep doing:**

- Module-boundary discipline: components → store/lib only.
- Co-located unit tests; `clearAllTasks()` + `clearUndoStack()` (and now `clearAllFocus()`) in `beforeEach`.
- Window-level keydown listener on `<App>` with `isEditableTarget` guard. 1.7 EXTENDS this exact pattern.
- The Solid testing-library recipe: `import { render, cleanup } from "@solidjs/testing-library"; afterEach(() => cleanup());`.
- `event.isComposing` guard for IME safety. Apply to the App-level handler at all branches.
- `if (isEditing()) return` early-exit at the top of `handleRowClick` — preserve.
- Unconditional event-handler binding + internal state checks (avoid jsdom Solid event-delegation bugs from 1.5).
- `setEditingTask(null)` (replacing `setIsEditing(false)`) MUST be LAST in `commitEdit`.

**Sandbox / environment quirks (carried from 1.1–1.6):**

- E2E tests cannot launch in sandboxes that block `listen()`. Defer Playwright to CI; commit specs.
- `pnpm` install: `COREPACK_HOME=.corepack` prefix in some sandboxes.
- `noUncheckedIndexedAccess` requires non-null assertions in tests (`tasks[0]!.text`) AND in App's `tasks[idx]!` reads.

**Bundle size from 1.6:** JS: 9.26 KB gzip (out of 50KB ceiling). Story 1.7 target: ≤+1.5KB JS gzipped (focus-store, lifted handler, TaskRow effect). Hard ceiling per NFR6: ≤50KB initial JS gzipped. CSS delta: 0.

### Git Intelligence — recent commits

```
1203c5b feat: add session-long undo stack implementation (story 1.6)
c87e8d7 feat(1.5): complete code review with 9 patches and defer 1 item
850112a feat: complete story 1.4 review and initialize story 1.5
789954e feat: complete code review for stories 1-2 and 1-3
1ea97a9 feat: add story 1.3 task capture loop and empty state implementation
```

Commit-message style: imperative mood, conventional-commits prefix (`feat:`, `feat(1.N):`). Suggested title for 1.7 implementation commit: `feat(1.7): add roving-tabindex keyboard navigation and two-cursor focus model`. Suggested title for review-patch commit: `feat(1.7): complete code review with N patches`.

### Latency budget reminder

NFR-Perf-1 (<16ms p95 keystroke-to-render) — every keystroke handled by the App switch is one synchronous tick (read signal → mutate signal → Solid re-render). Well within budget.

NFR-Perf-2 (<50ms p95 completion-to-strikethrough) — `x` from a focused row: read focus-store, read tasks[idx], call `toggleTaskCompleted`, push undo. CSS strike-through follows `data-completed`. Sub-frame.

NFR9 (latency under reduced-motion) — focus ring is a static outline, no motion. Reduced-motion is identical. Confirmed.

### Self-honesty / anti-feature compliance

UX spec line 1129 (the "undo-as-the-confirmation" pattern) and FR35 ("never requires modal dialogs for primary task operations") together require: every keyboard-driven destructive action (`x`/`d`/`e`-commit) must execute IMMEDIATELY with no confirmation prompt, AND must push to the undo stack. Story 1.7 honors this by:

- Lifting handlers without changing the push-on-action discipline (snapshot → mutate → push undo).
- Not introducing any `confirm(`/`<Modal>`/`<Dialog>` at the call sites.
- Not introducing any "you pressed `d`" toast or "1 item deleted" banner.

The visible response IS: the row disappears (delete), the strike-through appears (complete), the contenteditable opens (edit). These are the only feedbacks needed.

Specifically forbidden additions (would silently re-introduce anti-features):

- "Press `?` for shortcuts" overlay — Growth scope.
- Highlighting the focus ring with a color flash on navigation — FR53 (no decorative motion).
- Sound on focus change — FR52 (no audible notification).
- "You're at the top / bottom of the list" message when `j`/`k` clamps — pure visual is the signal; the focus ring stays put.

### Project Context Reference

- PRD: FR32 (keyboard navigation between tasks), FR33 (100% keyboard reachability for MVP ops), FR34 (pointer/touch parity), FR35 (no modal dialogs), NFR-A11y-3 (100% MVP user-facing functionality reachable via keyboard alone, verified by automated keyboard-only e2e), NFR-A11y-5 (accessible names), FR42 (semantic roles for AT), FR41 (`prefers-reduced-motion`), NFR-Perf-1 (≤16ms keystroke-to-render).
- Architecture: `architecture.md` line 280 (createSignal for focused-row index); line 285 (`<App>`/`<TaskList>`/`<TaskRow>`/`<CaptureLine>` from UX Step 11); line 415 (focus-ring rules in styles); line 628–648 (`focus-store.ts` location and roles); line 798–826 (App owns global keyboard; TaskList roving tabindex; `j`/`k` first-press lands on row 0); line 858 (`:focus-visible` not `:focus`); line 959 (FR Coverage: `<App>` global keyboard, `<TaskList>` roving tabindex, `focus-store`); line 982 (`tests/e2e/keyboard-only.spec.ts` for NFR-A11y-3); line 1026 (cmd+enter PWA-scoped not browser-global).
- UX spec: lines 286 (component count includes `<FocusRing>`); 311 (`<FocusRing>` in component table); 532–533 (focus ring is part of identity); 546–556 (focus + completion validation); 588–602 (Journey 1 mechanics — `j`/`k` navigate, `x` toggles); 755–760 (Journey Patterns: capture-line focus stickiness, undo-as-confirmation, reversibility-via-same-primitive); 798 (App owns global keyboard shortcuts including `n`/`j`/`k`/`x`/`u`/`e`/`Cmd+Enter`); 803–826 (`<TaskList>` keyboard navigation contract); 858 (focus ring via `:focus-visible`); 909 (capture-line focus stickiness — theme toggle / completion / `j`/`k` / undo do NOT steal focus); 982–1008 (`<FocusRing>` spec); 1046 (Phase 3 step 9: keyboard navigation); 1083 (Focus + Selection pattern: roving tabindex + accent focus ring); 1144–1163 (Focus + Selection pattern: two-cursor model load-bearing).
- Epics: Story 1.7 acceptance criteria; UX-DR9 (`<App>` owns global keyboard handler); UX-DR10 (`<TaskList>` roving tabindex); UX-DR15 (`<FocusRing>`); UX-DR17 (two-cursor focus model load-bearing).
- Previous story: `1-6-session-long-undo-stack.md` — push-undo at destructive call sites stays; lift-and-shift design from row to App; `isEditableTarget` guard pattern; window-listener convention; bundle baseline 9.26KB.
- Story 1.5: `1-5-task-edit-and-delete.md` — `enterEditMode`/`commitEdit`/`cancelEdit` flow; `setIsEditing(false)`-LAST ordering; `getTaskById` clone semantics.

### References

- [Source: epics.md#Story 1.7] — acceptance criteria source.
- [Source: epics.md#FR32] — keyboard navigation between tasks.
- [Source: epics.md#FR33] — 100% keyboard reachability for MVP ops.
- [Source: epics.md#FR34] — pointer/touch parity.
- [Source: epics.md#FR35] — no modal dialogs for primary task ops.
- [Source: epics.md#NFR18] — NFR-A11y-3, 100% MVP functionality reachable via keyboard alone.
- [Source: epics.md#UX-DR9] — `<App>` global keyboard handler set: `n`/`j`/`k`/`x`/`u`/`e`/`cmd+enter`/`cmd+shift+L`.
- [Source: epics.md#UX-DR10] — `<TaskList>` roving-tabindex; arrow keys alias `j`/`k`.
- [Source: epics.md#UX-DR15] — `<FocusRing>` 2px outline + 4px offset on `:focus-visible`.
- [Source: epics.md#UX-DR17] — two-cursor focus model: capture-line caret + list focus ring, independent.
- [Source: ux-design-specification.md#Custom Components > `<App>`] — global keyboard ownership (line 798).
- [Source: ux-design-specification.md#Custom Components > `<TaskList>`] — roving tabindex; arrow-key aliases (lines 803–826).
- [Source: ux-design-specification.md#Custom Components > `<CaptureLine>`] — capture-line focus stickiness (line 909).
- [Source: ux-design-specification.md#Custom Components > `<FocusRing>`] — `:focus-visible` 2px accent outline + 4px offset; outline survives forced-colors (lines 982–1008).
- [Source: ux-design-specification.md#Journey Patterns] — capture-line focus stickiness (1); reversibility via same primitive (6) (lines 755–760).
- [Source: ux-design-specification.md#Focus + Selection Pattern] — two-cursor model load-bearing (lines 1144–1163).
- [Source: architecture.md#Frontend Architecture] — `createSignal` for focused-row index (line 280); component model (line 285).
- [Source: architecture.md#Project Structure] — `focus-store.ts` location and roles (line 648).
- [Source: architecture.md#FR Coverage Map] — FR32–35 (Input/nav) → `<App>` global keyboard, `<TaskList>` roving tabindex, `focus-store` (line 959).
- [Source: architecture.md#Tech Stack] — pinned versions; `solid-js ^1.9.5`.
- [Source: architecture.md#Key Architectural Decisions] — `cmd+enter` PWA-scoped (line 1026).
- [Source: 1-6-session-long-undo-stack.md] — `isEditableTarget` guard; push-on-action discipline; lift-and-shift anticipation; bundle baseline.
- [Source: 1-5-task-edit-and-delete.md] — edit-mode lifecycle; `setIsEditing(false)` ordering; `getTaskById` clone.

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming): MATCHES architecture.md § Project Structure line 648 exactly. `apps/web/src/store/focus-store.ts` and co-located test are the canonical locations.
- Detected conflicts or variances: NONE in this story. The "default-focused-row pattern" (Option B in Component Implementation Details) is one degree of freedom not specified in architecture; choice rationalized inline (simpler, fully spec-compliant for AC#1 first-press behavior).

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (claude-opus-4-7[1m])

### Debug Log References

- `pnpm typecheck` — passed (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes).
- `pnpm lint` — passed (initial run flagged a missing `KeyboardEventInit` global in App.test.tsx; fixed by inlining a structural type for the dispatchKey helper).
- `bash scripts/check-anti-features.sh` — passed.
- `pnpm test` — 170/170 unit tests passing across 14 test files.
- `pnpm build` — passed; JS bundle 25.28 KB raw / **9.65 KB gzip** (baseline 9.26 KB → +0.39 KB; well under 50 KB NFR6 ceiling). CSS unchanged at 8.00 KB / 2.51 KB gzip.
- `pnpm test:e2e` — deferred to CI (sandbox cannot launch Playwright). Spec committed at `tests/e2e/keyboard-only.spec.ts`.

### Review Findings

Code review of Story 1.7 — 2026-04-28. Three review layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor) ran against the 25071f4..1203c5b diff.

**Patches (7 — fixable now, unambiguous):**

- [x] [Review][Patch] Add test asserting `document.activeElement === liRef` after `setEditingTask(null)` [apps/web/src/components/TaskRow.test.tsx] — Auditor: spec Task 6.4 prescribes this assertion; current "removes contenteditable" test only verifies attribute removal, not the AC#10 return-to-row DOM focus invariant.
- [x] [Review][Patch] Add `if (event.repeat) return;` near top of App's keydown handler [apps/web/src/components/App.tsx:32] — Edge Case: held `u` floods the undo stack, held `d`/`x` rapidly mutate; per-press semantics are the intended model, OS auto-repeat is not.
- [x] [Review][Patch] Add edit-mode guard to App's `d` case: refuse delete when `editingTaskId() === task.id` [apps/web/src/components/App.tsx:100-117] — Edge Case: deleting the row currently in edit-mode orphans `editingTaskId` and leaves a contenteditable span attached to a vanished task.
- [x] [Review][Patch] Add edit-mode guard to App's `e` case: `if (editingTaskId() !== null && editingTaskId() !== task.id) return;` [apps/web/src/components/App.tsx:89-98] — Edge Case: TaskRow's `enterEditMode` has this guard but App writes `editingTaskId` directly, bypassing it; would let two rows enter edit-mode without committing the first.
- [x] [Review][Patch] Add edit-mode guard to App's `x` case so toggling completion is refused while the focused row is being edited [apps/web/src/components/App.tsx:74-87] — Edge Case: AC#3 expects `x` against the focused row; with edit-mode active the contenteditable owns DOM focus anyway, but defensive parity prevents test-injected state from causing an uncommitted toggle.
- [x] [Review][Patch] Add test for `k`/`ArrowUp` from `focusedRowIndex() === null` landing on row 0 [apps/web/src/components/App.test.tsx] — Blind Hunter: focus-store unit covers it but App-layer behavior (full keyboard model) is not asserted; AC#2's "first K from null" sub-rule is otherwise untested at the integration layer.
- [x] [Review][Patch] Add e2e assertion that no `<li>` gains `data-focused="true"` while typing `jkxu` in the capture line [tests/e2e/keyboard-only.spec.ts:78-83] — Blind Hunter: current test only asserts input value and `li` count; AC#5 stickiness deserves an explicit "no row received focus" check.

**Deferred (8 — real but not actionable now):**

- [x] [Review][Defer] Multi-step undo position semantics: undoing `d` after intervening `j`/`k`/edits restores the task at the original index, which can surprise users — deferred, pre-existing pattern from Story 1.6
- [x] [Review][Defer] Roving tabindex lacks `role="listbox"`/`aria-activedescendant` (or `role="option"`/`aria-current`) so screen readers don't announce "row N of M selected" — deferred, NFR-A11y-5 enhancement, slot in Story 1.8 a11y audit
- [x] [Review][Defer] No automated test for focus ring under `forced-colors`/high-contrast mode — deferred, AC#7 verification belongs in Story 1.12 visual-regression gate
- [x] [Review][Defer] Bundle-size NFR6 budget is self-reported with no automated CI gate — deferred, Story 1.12 territory
- [x] [Review][Defer] Default-focused-row (Option B) creates a phantom Tab target with no `data-focused="true"` indicator until first navigation — accessible but semantically surprising for AT — deferred, slot with NFR-A11y-5 work in Story 1.8
- [x] [Review][Defer] No `scrollIntoView` on `j`/`k` navigation; long lists let focus leave the viewport — deferred, scroll-into-view is a UX enhancement and current MVP fits in viewport
- [x] [Review][Defer] Browser-quirk defensives unhandled: AltGr+Enter on European layouts, Numpad arrows via `event.code`, Safari dead-key compose timing, Shadow-DOM editables, bfcache restore before `onMount`, `event.key` undefined — deferred, defensive-only with no observed failures in target browser matrix
- [x] [Review][Defer] `focusCaptureLine`/`Cmd+Enter` clear row focus even when `captureInputRef` is null (CaptureLine unmounted), leaving no DOM focus — deferred, CaptureLine is a permanent fixture in v1; revisit if it ever becomes conditional

**Dismissed:** 33 noise/speculative findings (jsdom-vs-browser equivalences, justified Option B AC#8 deviation, three cosmetic Auditor wording deviations, pushUndo ordering misread, single-threaded JS race claims, Solid effect-scheduling speculations).

### Completion Notes List

- `focus-store.ts` exposes the three signals as read-only getters and routes mutation through named helpers (`focusNextRow`, `focusPrevRow`, `setRowFocus`, `clearRowFocus`, `setEditingTask`, `setCaptureInputRef`, `focusCaptureLine`, `clearAllFocus`). Per task 6.1's "callers validate" contract, `setRowFocus` does not clamp; clamping happens at App's delete-cleanup site.
- TaskRow's `<For>`-supplied `index` prop is read reactively (`props.index` accessor pattern). The roving-tabindex contract is implemented with the **Option B default-focused-row pattern**: when `focusedRowIndex()` is null, row 0 receives `tabindex="0"` so a Tab from CaptureLine lands on it; `data-focused="true"` only appears when the index is explicitly set, so the focus ring still doesn't render until the user navigates.
- `handleRowKeyDown` and the `onKeyDown={handleRowKeyDown}` binding were deleted from TaskRow — the App-level switch is now the canonical owner of x/e/d/u for the focused row. `handleRowClick` and `handleCheckboxChange` undo-push call sites are preserved (mouse/checkbox pathways).
- App's switch orders the Cmd+Enter check **before** the `isEditableTarget` guard so the shortcut fires even from inside CaptureLine, and CaptureLine's `handleKeyDown` early-returns on `metaKey || ctrlKey` to prevent double-fire.
- `commitEdit`/`cancelEdit` now set `editingTaskId` to null as their LAST action; the `createEffect` in TaskRow re-applies DOM focus to the `<li>` automatically when `isEditing()` flips back to false (single source of truth for return-to-row focus).
- `D` deletion adjusts focus per AC#9: clears focus when the list empties, moves to the new last index when the deleted row was last, otherwise leaves the index untouched (next task slid up).
- Unit tests cover all 11 ACs (the keyboard-only E2E covers AC#11 and is committed for CI). Two-cursor independence (AC#6) is asserted explicitly via `selectionStart`/`selectionEnd` after a focused-row toggle.

### File List

**New:**

- `apps/web/src/store/focus-store.ts`
- `apps/web/src/store/focus-store.test.ts`
- `tests/e2e/keyboard-only.spec.ts`

**Modified:**

- `apps/web/src/components/App.tsx`
- `apps/web/src/components/App.test.tsx`
- `apps/web/src/components/TaskList.tsx`
- `apps/web/src/components/TaskList.test.tsx`
- `apps/web/src/components/TaskRow.tsx`
- `apps/web/src/components/TaskRow.test.tsx`
- `apps/web/src/components/CaptureLine.tsx`
- `apps/web/src/components/CaptureLine.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-04-28 — Story 1.7 implemented: introduced `focus-store.ts` (focusedRowIndex / editingTaskId / captureInputRef + helpers), wired roving tabindex in TaskList/TaskRow with default-focused-row pattern, lifted x/e/d keystroke handlers from TaskRow to App's global handler, added n / Cmd+Enter capture-line return shortcuts, registered CaptureLine ref with focus-store, absorbed Cmd+Enter no-op in CaptureLine. 170 unit tests passing; keyboard-only E2E spec committed for CI (NFR-A11y-3). JS bundle +0.39 KB gzip (9.26 → 9.65, ceiling 50). Status: ready-for-dev → review.
