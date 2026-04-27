import type { ActiveTask } from "../store/task-store";

export function TaskRow(props: { task: ActiveTask }) {
  return <li class="task-row">{props.task.text}</li>;
}
