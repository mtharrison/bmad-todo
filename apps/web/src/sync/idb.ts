import { openDB, type IDBPDatabase, type DBSchema } from "idb";
import type { Mutation, Task } from "@bmad-todo/shared";

export interface OutboxEntry {
  id: string;
  mutation: Mutation;
  idempotencyKey: string;
  queuedAt: number;
  attempts: number;
  nextAttemptAt?: number;
}

interface TodoDb extends DBSchema {
  tasks: { key: string; value: Task };
  outbox: { key: string; value: OutboxEntry };
}

let dbPromise: Promise<IDBPDatabase<TodoDb>> | null = null;

function db(): Promise<IDBPDatabase<TodoDb>> {
  if (!dbPromise) {
    dbPromise = openDB<TodoDb>("bmad-todo", 1, {
      upgrade(d) {
        d.createObjectStore("tasks", { keyPath: "id" });
        d.createObjectStore("outbox", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

export async function getAllTasks(): Promise<Task[]> {
  return (await db()).getAll("tasks");
}

export async function putTask(task: Task): Promise<void> {
  await (await db()).put("tasks", task);
}

export async function deleteCachedTask(id: string): Promise<void> {
  await (await db()).delete("tasks", id);
}

export async function getAllOutboxEntries(): Promise<OutboxEntry[]> {
  return (await db()).getAll("outbox");
}

export async function putOutboxEntry(e: OutboxEntry): Promise<void> {
  await (await db()).put("outbox", e);
}

export async function deleteOutboxEntry(id: string): Promise<void> {
  await (await db()).delete("outbox", id);
}

export async function clearAll(): Promise<void> {
  const d = await db();
  const tx = d.transaction(["tasks", "outbox"], "readwrite");
  await Promise.all([tx.objectStore("tasks").clear(), tx.objectStore("outbox").clear(), tx.done]);
}

export async function _resetForTesting(): Promise<void> {
  if (dbPromise) {
    try {
      const d = await dbPromise;
      d.close();
    } catch {
      // ignore
    }
  }
  dbPromise = null;
}
