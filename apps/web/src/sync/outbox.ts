import type { Mutation, SyncState, Task } from "@bmad-todo/shared";
import { generateId } from "../lib/ids";
import { ApiError, deleteTaskRequest, patchTask, postTask } from "./api-client";
import {
  deleteOutboxEntry,
  getAllOutboxEntries,
  putOutboxEntry,
  putTask,
  type OutboxEntry,
} from "./idb";

const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 32000, 60000];

type SyncObserver = (state: SyncState) => void;
let syncObserver: SyncObserver | null = null;

export function setSyncObserver(observer: SyncObserver | null): void {
  syncObserver = observer;
}

function emit(state: SyncState): void {
  syncObserver?.(state);
}

function backoffFor(attempts: number): number {
  const idx = Math.min(attempts, BACKOFF_MS.length - 1);
  return BACKOFF_MS[idx]!;
}

export async function enqueue(mutation: Mutation): Promise<void> {
  const entry: OutboxEntry = {
    id: generateId(),
    mutation,
    idempotencyKey: mutation.idempotencyKey,
    queuedAt: Date.now(),
    attempts: 0,
  };
  await putOutboxEntry(entry);
}

async function dispatchEntry(entry: OutboxEntry): Promise<Task | null> {
  const m = entry.mutation;
  switch (m.type) {
    case "create":
      return postTask({ id: m.id, text: m.text, createdAt: m.createdAt }, m.idempotencyKey);
    case "update": {
      const patch: { text?: string; completedAt?: number | null } = {};
      if (m.text !== undefined) patch.text = m.text;
      if (m.completedAt !== undefined) patch.completedAt = m.completedAt;
      return patchTask(m.id, patch, m.idempotencyKey);
    }
    case "delete":
      await deleteTaskRequest(m.id, m.idempotencyKey);
      return null;
  }
}

export interface DrainResult {
  applied: number;
  rejected: number;
  remaining: number;
}

let draining = false;

export async function drain(): Promise<DrainResult> {
  if (draining) return { applied: 0, rejected: 0, remaining: -1 };
  draining = true;
  try {
    return await drainInternal();
  } finally {
    draining = false;
  }
}

async function drainInternal(): Promise<DrainResult> {
  const entries = await getAllOutboxEntries();
  entries.sort((a, b) => a.queuedAt - b.queuedAt || (a.id < b.id ? -1 : 1));

  let applied = 0;
  let rejected = 0;
  const now = Date.now();

  for (const entry of entries) {
    if (entry.nextAttemptAt && entry.nextAttemptAt > now) {
      continue;
    }
    try {
      const serverTask = await dispatchEntry(entry);
      await deleteOutboxEntry(entry.id);
      if (serverTask) await putTask(serverTask);
      applied += 1;
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 429) {
        await deleteOutboxEntry(entry.id);
        rejected += 1;
        emit("error");
        continue;
      }
      // Network/5xx: bump attempts, set next-attempt, halt drain after this entry.
      const next: OutboxEntry = {
        ...entry,
        attempts: entry.attempts + 1,
        nextAttemptAt: Date.now() + backoffFor(entry.attempts),
      };
      await putOutboxEntry(next);
      emit("offline");
      const remaining = (await getAllOutboxEntries()).length;
      return { applied, rejected, remaining };
    }
  }

  if (applied > 0) emit("online");
  const remaining = (await getAllOutboxEntries()).length;
  return { applied, rejected, remaining };
}

export async function enqueueAndDrain(mutation: Mutation): Promise<void> {
  await enqueue(mutation);
  try {
    await drain();
  } catch {
    // drain is internally resilient; any throw here is non-fatal.
  }
}

export async function getOutboxSize(): Promise<number> {
  return (await getAllOutboxEntries()).length;
}

/**
 * Reset per-entry backoff windows so the next drain treats every entry as
 * immediately eligible. Called when the browser fires `online` — the user's
 * device just transitioned, so we should retry now rather than waiting for
 * a stale backoff timer to expire.
 */
export async function resetBackoff(): Promise<void> {
  const entries = await getAllOutboxEntries();
  for (const e of entries) {
    if (e.nextAttemptAt) {
      const next: OutboxEntry = { ...e, nextAttemptAt: 0 };
      await putOutboxEntry(next);
    }
  }
}
