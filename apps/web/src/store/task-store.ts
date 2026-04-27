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
  if (text.trim().length === 0) return;
  setTasks((t) => t.id === id, "text", text);
}

export function setTaskCompletedAt(id: string, value: number | null): void {
  setTasks((t) => t.id === id, "completedAt", value);
}

export function deleteTask(id: string): void {
  setTasks((prev) => prev.filter((t) => t.id !== id));
}

export function getTaskById(id: string): ActiveTask | undefined {
  const found = tasks.find((t) => t.id === id);
  return found ? { ...found } : undefined;
}

export function insertTaskAtIndex(task: ActiveTask, index: number): void {
  setTasks((prev) => {
    const clamped = Math.max(0, Math.min(index, prev.length));
    return [...prev.slice(0, clamped), task, ...prev.slice(clamped)];
  });
}

export function clearAllTasks(): void {
  setTasks(() => []);
}
