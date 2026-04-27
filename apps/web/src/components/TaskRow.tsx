import { createSignal, createRenderEffect } from "solid-js";
import { Show } from "solid-js";
import type { ActiveTask } from "../store/task-store";
import {
  toggleTaskCompleted,
  updateTaskText,
  deleteTask,
} from "../store/task-store";
import { Tick } from "./Tick";

function placeCursorAtEnd(el: HTMLElement) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel?.removeAllRanges();
  sel?.addRange(range);
}

export function TaskRow(props: { task: ActiveTask }) {
  const [isEditing, setIsEditing] = createSignal(false);
  let textRef: HTMLSpanElement | undefined;
  let originalText = "";

  createRenderEffect(() => {
    const text = props.task.text;
    const editing = isEditing();
    if (textRef && !editing) {
      textRef.textContent = text;
    }
  });

  function enterEditMode() {
    if (isEditing()) return;
    originalText = props.task.text;
    setIsEditing(true);
    queueMicrotask(() => {
      if (textRef) {
        textRef.focus();
        placeCursorAtEnd(textRef);
      }
    });
  }

  function commitEdit() {
    if (!isEditing()) return;
    const newText = textRef?.textContent ?? "";
    if (newText.trim().length === 0) {
      // 1.6: const snapshot = getTaskById(props.task.id); const index = tasks.findIndex(t => t.id === props.task.id);
      deleteTask(props.task.id);
      // 1.6: pushUndo({ type: 'insert', task: snapshot, index });
    } else if (newText.trim() !== originalText) {
      // 1.6: const previousText = originalText;
      updateTaskText(props.task.id, newText.trim());
      // 1.6: pushUndo({ type: 'updateText', id: props.task.id, previousText });
    }

    setIsEditing(false);
  }

  function cancelEdit() {
    if (textRef) textRef.textContent = originalText;
    setIsEditing(false);
  }

  function handleEditKeyDown(event: KeyboardEvent) {
    if (!isEditing()) return;
    if (event.isComposing) return;
    if (event.key === "Enter") {
      event.preventDefault();
      commitEdit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  }

  function handleEditFocusOut() {
    commitEdit();
  }

  function handleRowClick(event: MouseEvent) {
    if (isEditing()) return;
    const target = event.target as HTMLElement;
    if (target.closest(".task-text")) {
      enterEditMode();
      return;
    }
    toggleTaskCompleted(props.task.id);
  }

  function handleRowKeyDown(event: KeyboardEvent) {
    if (isEditing()) return;
    if (event.target !== event.currentTarget) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === "x" || event.key === "X") {
      event.preventDefault();
      toggleTaskCompleted(props.task.id);
    } else if (event.key === "e" || event.key === "E") {
      event.preventDefault();
      enterEditMode();
    } else if (event.key === "d" || event.key === "D") {
      event.preventDefault();
      // 1.6: const snapshot = getTaskById(props.task.id); const index = tasks.findIndex(t => t.id === props.task.id);
      deleteTask(props.task.id);
      // 1.6: pushUndo({ type: 'insert', task: snapshot, index });
    }
  }

  return (
    <li
      class="task-row"
      data-completed={props.task.completedAt !== null ? "true" : "false"}
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
      <span
        class="task-text"
        ref={(el) => {
          textRef = el;
          el.textContent = props.task.text;
        }}
        contentEditable={isEditing() ? "plaintext-only" : undefined}
        onKeyDown={handleEditKeyDown}
        onFocusOut={handleEditFocusOut}
      />
    </li>
  );
}
