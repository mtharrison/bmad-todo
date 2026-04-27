import { createStore } from "solid-js/store";
import { generateId } from "../lib/ids";

export type ActiveTask = {
  id: string;
  text: string;
  createdAt: number;
  completedAt: number | null;
};

const [tasks, setTasks] = createStore<ActiveTask[]>([]);

export { tasks };

export function createTask(text: string): void {
  const trimmed = text.trim();
  if (trimmed.length === 0) return;
  const task: ActiveTask = {
    id: generateId(),
    text: trimmed,
    createdAt: Date.now(),
    completedAt: null,
  };
  setTasks((prev) => [task, ...prev]);
}

export function toggleTaskCompleted(id: string): void {
  setTasks(
    (t) => t.id === id,
    "completedAt",
    (current) => (current === null ? Date.now() : null),
  );
}

export function updateTaskText(id: string, text: string): void {
  setTasks((t) => t.id === id, "text", text);
}

export function deleteTask(id: string): void {
  setTasks((prev) => prev.filter((t) => t.id !== id));
}

export function getTaskById(id: string): ActiveTask | undefined {
  return tasks.find((t) => t.id === id);
}

export function insertTaskAtIndex(task: ActiveTask, index: number): void {
  setTasks((prev) => [...prev.slice(0, index), task, ...prev.slice(index)]);
}

export function clearAllTasks(): void {
  setTasks(() => []);
}
