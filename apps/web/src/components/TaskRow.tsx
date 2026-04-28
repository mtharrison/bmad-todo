import { createRenderEffect, createEffect } from "solid-js";
import { Show } from "solid-js";
import type { ActiveTask } from "../store/task-store";
import {
  tasks,
  toggleTaskCompleted,
  updateTaskText,
  deleteTask,
  getTaskById,
} from "../store/task-store";
import { editingTaskId, setEditingTask, focusedRowIndex, setRowFocus } from "../store/focus-store";
import { pushUndo } from "../store/undo-stack";
import { Tick } from "./Tick";
import { latencyTracker } from "../lib/latency";

function placeCursorAtEnd(el: HTMLElement) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel?.removeAllRanges();
  sel?.addRange(range);
}

export function TaskRow(props: { task: ActiveTask; index: number }) {
  const isEditing = () => editingTaskId() === props.task.id;
  let textRef: HTMLSpanElement | undefined;
  let liRef: HTMLLIElement | undefined;
  let originalText = "";

  createRenderEffect(() => {
    const text = props.task.text;
    const editing = isEditing();
    if (textRef && !editing) {
      textRef.textContent = text;
    }
  });

  createEffect(() => {
    if (focusedRowIndex() === props.index && !isEditing() && liRef) {
      liRef.focus();
    }
  });

  createEffect(() => {
    if (isEditing() && textRef) {
      textRef.focus();
      placeCursorAtEnd(textRef);
    }
  });

  function enterEditMode() {
    if (isEditing()) return;
    if (editingTaskId() !== null) return;
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
    const newText = textRef?.textContent ?? "";
    if (newText.trim().length === 0) {
      const snapshot = getTaskById(props.task.id);
      const index = tasks.findIndex((t) => t.id === props.task.id);
      if (!snapshot || index === -1) {
        setEditingTask(null);
        return;
      }
      deleteTask(props.task.id);
      pushUndo({ inverseMutation: { type: "insert", task: snapshot, index } });
    } else if (newText.trim() !== originalText) {
      const previousText = originalText;
      updateTaskText(props.task.id, newText.trim());
      pushUndo({ inverseMutation: { type: "updateText", id: props.task.id, previousText } });
    }

    setEditingTask(null);
  }

  function cancelEdit() {
    if (textRef) textRef.textContent = originalText;
    setEditingTask(null);
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

  function handleCheckboxChange() {
    if (latencyTracker.isActive()) {
      latencyTracker.recordCompletionStart();
      requestAnimationFrame(() => latencyTracker.recordCompletionEnd());
    }
    const previousCompletedAt = props.task.completedAt;
    toggleTaskCompleted(props.task.id);
    pushUndo({
      inverseMutation: { type: "setCompletedAt", id: props.task.id, previousCompletedAt },
    });
  }

  function handleRowClick(event: MouseEvent) {
    if (isEditing()) return;
    const target = event.target as HTMLElement;
    if (target.closest(".task-text")) {
      enterEditMode();
      return;
    }
    if (latencyTracker.isActive()) {
      latencyTracker.recordCompletionStart();
      requestAnimationFrame(() => latencyTracker.recordCompletionEnd());
    }
    const previousCompletedAt = props.task.completedAt;
    toggleTaskCompleted(props.task.id);
    pushUndo({
      inverseMutation: { type: "setCompletedAt", id: props.task.id, previousCompletedAt },
    });
  }

  function handleRowFocus() {
    if (isEditing()) return;
    if (focusedRowIndex() !== props.index) setRowFocus(props.index);
  }

  return (
    <li
      ref={liRef}
      class="task-row"
      data-completed={props.task.completedAt !== null ? "true" : "false"}
      data-focused={focusedRowIndex() === props.index ? "true" : "false"}
      tabindex={
        focusedRowIndex() === props.index || (focusedRowIndex() === null && props.index === 0)
          ? 0
          : -1
      }
      onClick={handleRowClick}
      onFocus={handleRowFocus}
    >
      <input
        type="checkbox"
        class="task-checkbox"
        aria-label="Mark complete"
        checked={props.task.completedAt !== null}
        aria-checked={props.task.completedAt !== null}
        onChange={handleCheckboxChange}
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
