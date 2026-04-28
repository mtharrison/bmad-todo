import { For } from "solid-js";
import { tasks } from "../store/task-store";
import { TaskRow } from "./TaskRow";

export function TaskList() {
  return (
    <ul role="list" class="task-list">
      <For each={tasks}>{(task, index) => <TaskRow task={task} index={index()} />}</For>
    </ul>
  );
}
