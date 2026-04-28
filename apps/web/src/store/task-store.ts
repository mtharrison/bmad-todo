import { createStore } from "solid-js/store";
import type { Mutation, Task } from "@bmad-todo/shared";
import { generateId } from "../lib/ids";
import { deleteCachedTask, getAllOutboxEntries, getAllTasks, putTask } from "../sync/idb";
import { drain, enqueueAndDrain, resetBackoff } from "../sync/outbox";
import { fetchTasks } from "../sync/api-client";
import { setSyncState } from "./annunciator-store";

export type ActiveTask = Task;

const DEFAULT_NAMESPACE = "default";

const [tasks, setTasks] = createStore<ActiveTask[]>([]);

export { tasks };

function makeTask(text: string): ActiveTask {
  const now = Date.now();
  return {
    id: generateId(),
    userNamespace: DEFAULT_NAMESPACE,
    text,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
}

function safePut(task: ActiveTask): void {
  void putTask(task).catch(() => setSyncState("error"));
}

function safeDelete(id: string): void {
  void deleteCachedTask(id).catch(() => setSyncState("error"));
}

function safeEnqueue(mutation: Mutation): void {
  void enqueueAndDrain(mutation).catch(() => setSyncState("error"));
}

export function createTask(text: string): void {
  const trimmed = text.trim();
  if (trimmed.length === 0) return;
  const task = makeTask(trimmed);
  setTasks((prev) => [task, ...prev]);
  safePut(task);
  safeEnqueue({
    type: "create",
    id: task.id,
    text: task.text,
    createdAt: task.createdAt,
    idempotencyKey: generateId(),
  });
}

export function toggleTaskCompleted(id: string): void {
  let next: number | null | undefined;
  setTasks(
    (t) => t.id === id,
    "completedAt",
    (current) => {
      next = current === null ? Date.now() : null;
      return next;
    },
  );
  setTasks((t) => t.id === id, "updatedAt", Date.now());
  const updated = tasks.find((t) => t.id === id);
  if (updated) safePut(updated);
  if (next !== undefined) {
    safeEnqueue({
      type: "update",
      id,
      completedAt: next,
      idempotencyKey: generateId(),
    });
  }
}

export function updateTaskText(id: string, text: string): void {
  if (text.trim().length === 0) return;
  setTasks((t) => t.id === id, "text", text);
  setTasks((t) => t.id === id, "updatedAt", Date.now());
  const updated = tasks.find((t) => t.id === id);
  if (!updated) return;
  safePut(updated);
  safeEnqueue({
    type: "update",
    id,
    text,
    idempotencyKey: generateId(),
  });
}

export function setTaskCompletedAt(id: string, value: number | null): void {
  setTasks((t) => t.id === id, "completedAt", value);
  setTasks((t) => t.id === id, "updatedAt", Date.now());
  const updated = tasks.find((t) => t.id === id);
  if (!updated) return;
  safePut(updated);
  safeEnqueue({
    type: "update",
    id,
    completedAt: value,
    idempotencyKey: generateId(),
  });
}

export function deleteTask(id: string): void {
  const exists = tasks.some((t) => t.id === id);
  setTasks((prev) => prev.filter((t) => t.id !== id));
  if (!exists) return;
  safeDelete(id);
  safeEnqueue({
    type: "delete",
    id,
    idempotencyKey: generateId(),
  });
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
  safePut(task);
  // An undo-of-delete re-creates the same task id with a fresh idempotency key.
  // The server may return 409 if the row already exists; the outbox treats 4xx
  // as drop-and-continue (acceptable: client and server eventually converge).
  safeEnqueue({
    type: "create",
    id: task.id,
    text: task.text,
    createdAt: task.createdAt,
    idempotencyKey: generateId(),
  });
}

export function clearAllTasks(): void {
  setTasks(() => []);
}

export async function flushOutbox(): Promise<void> {
  try {
    await resetBackoff();
    // Drain repeatedly until the queue is empty or a transient failure halts
    // it. Each call respects backoff for entries that just failed.
    for (let i = 0; i < 5; i++) {
      const r = await drain();
      if (r.remaining === 0) return;
      if (r.applied === 0 && r.rejected === 0) return;
    }
  } catch {
    setSyncState("error");
  }
}

export async function hydrateFromCache(): Promise<void> {
  try {
    const cached = await getAllTasks();
    if (cached.length === 0) return;
    cached.sort((a, b) => (a.id < b.id ? 1 : -1));
    setTasks(() => cached);
  } catch {
    // IDB read failure during boot — keep empty store, signal error.
    setSyncState("error");
  }
}

export async function reconcileWithServer(): Promise<void> {
  try {
    const serverTasks = await fetchTasks();
    const serverById = new Map(serverTasks.map((t) => [t.id, t]));
    const localById = new Map(tasks.map((t) => [t.id, t]));
    const pending = await getAllOutboxEntries();
    const pendingIds = new Set(pending.map((e) => e.mutation.id));

    let hasConflict = false;
    const merged: ActiveTask[] = [];
    for (const st of serverTasks) {
      if (pendingIds.has(st.id)) {
        const local = localById.get(st.id);
        if (local && st.updatedAt > local.updatedAt) {
          hasConflict = true;
        }
        // Preserve local version for tasks with pending mutations
        merged.push(local ?? st);
      } else {
        merged.push(st);
      }
    }
    // Preserve local-only tasks not yet on server
    for (const t of tasks) {
      if (!serverById.has(t.id)) merged.push(t);
    }
    merged.sort((a, b) => (a.id < b.id ? 1 : -1));
    setTasks(() => merged);
    // Update IDB cache with server tasks that have no pending mutations
    for (const t of serverTasks) {
      if (!pendingIds.has(t.id)) await putTask(t);
    }
    setSyncState(hasConflict ? "conflict" : "online");
  } catch {
    setSyncState("offline");
  }
}
