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
  const task: ActiveTask = {
    id: generateId(),
    text,
    createdAt: Date.now(),
  };
  setTasks((prev) => [task, ...prev]);
}

export function clearAllTasks(): void {
  setTasks(() => []);
}
