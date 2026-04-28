import { onMount, onCleanup } from "solid-js";
import { Annunciator } from "./Annunciator";
import { CaptureLine } from "./CaptureLine";
import { TaskList } from "./TaskList";
import { applyUndo, pushUndo } from "../store/undo-stack";
import {
  focusedRowIndex,
  focusNextRow,
  focusPrevRow,
  setRowFocus,
  clearRowFocus,
  editingTaskId,
  setEditingTask,
  focusCaptureLine,
} from "../store/focus-store";
import {
  tasks,
  toggleTaskCompleted,
  deleteTask,
  getTaskById,
  flushOutbox,
  reconcileWithServer,
} from "../store/task-store";
import { theme, toggleTheme } from "../store/theme-store";
import { setSyncState } from "../store/annunciator-store";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function App() {
  onMount(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      // OS auto-repeat from a held key is not the intended interaction model:
      // held `u` would flood the undo stack, held `d`/`x` would mutate per repeat.
      if (event.repeat) return;

      // Cmd+Enter / Ctrl+Enter focuses capture line — works EVEN from inside the capture line
      // and EVEN from inside an editable element. Must come BEFORE the isEditableTarget guard.
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        focusCaptureLine();
        return;
      }

      // All other shortcuts: skip when target is an input/textarea/contenteditable
      // (load-bearing capture-line stickiness rule, AC#5).
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
          // Refuse mid-edit toggles on the editing row to keep the commit boundary clean.
          if (editingTaskId() === task.id) return;
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
          // Mirror TaskRow's enterEditMode guard: refuse a second edit while another row is editing.
          const editing = editingTaskId();
          if (editing !== null && editing !== task.id) return;
          event.preventDefault();
          setEditingTask(task.id);
          return;
        }

        case "t":
        case "T":
          event.preventDefault();
          toggleTheme();
          return;

        case "d":
        case "D": {
          const idx = focusedRowIndex();
          if (idx === null) return;
          const task = tasks[idx];
          if (!task) return;
          // Refuse delete on a row that is currently being edited so the contenteditable
          // and editingTaskId never outlive the underlying task.
          if (editingTaskId() === task.id) return;
          event.preventDefault();
          const snapshot = getTaskById(task.id);
          if (!snapshot) return;
          deleteTask(task.id);
          pushUndo({
            inverseMutation: { type: "insert", task: snapshot, index: idx },
          });
          const newLen = tasks.length;
          if (newLen === 0) clearRowFocus();
          else if (idx >= newLen) setRowFocus(newLen - 1);
          return;
        }
      }
    };
    window.addEventListener("keydown", handler);

    const onlineHandler = () => {
      setSyncState("online");
      void flushOutbox().then(() => reconcileWithServer());
    };
    const offlineHandler = () => setSyncState("offline");
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);

    void reconcileWithServer();

    onCleanup(() => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    });
  });

  return (
    <main class="app-main bg-paper text-ink">
      <CaptureLine />
      <TaskList />
      <Annunciator />
      <button
        type="button"
        class="theme-toggle"
        aria-label="Toggle theme"
        aria-pressed={theme() === "dark" ? "true" : "false"}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => toggleTheme()}
      >
        Toggle theme
      </button>
    </main>
  );
}
