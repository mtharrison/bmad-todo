import { Show } from "solid-js";
import type { ActiveTask } from "../store/task-store";
import { toggleTaskCompleted } from "../store/task-store";
import { Tick } from "./Tick";

export function TaskRow(props: { task: ActiveTask }) {
  function handleRowClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.closest(".task-text")) return;
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
