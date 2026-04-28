import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  _resetForTesting,
  clearAll,
  deleteCachedTask,
  deleteOutboxEntry,
  getAllOutboxEntries,
  getAllTasks,
  putOutboxEntry,
  putTask,
  type OutboxEntry,
} from "./idb";
import type { Task } from "@bmad-todo/shared";

function makeTask(id: string): Task {
  return {
    id,
    userNamespace: "default",
    text: `task ${id}`,
    completedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function makeEntry(id: string): OutboxEntry {
  return {
    id,
    mutation: { type: "create", id, text: "x", createdAt: 1, idempotencyKey: id },
    idempotencyKey: id,
    queuedAt: 1,
    attempts: 0,
  };
}

describe("sync/idb", () => {
  beforeEach(async () => {
    await _resetForTesting();
    const req = indexedDB.deleteDatabase("bmad-todo");
    await new Promise<void>((resolve, reject) => {
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
  });

  it("round-trips tasks (put / getAll / delete)", async () => {
    await putTask(makeTask("a"));
    await putTask(makeTask("b"));
    let all = await getAllTasks();
    expect(all.map((t) => t.id).sort()).toEqual(["a", "b"]);
    await deleteCachedTask("a");
    all = await getAllTasks();
    expect(all.map((t) => t.id)).toEqual(["b"]);
  });

  it("round-trips outbox entries", async () => {
    await putOutboxEntry(makeEntry("1"));
    await putOutboxEntry(makeEntry("2"));
    let entries = await getAllOutboxEntries();
    expect(entries.length).toBe(2);
    await deleteOutboxEntry("1");
    entries = await getAllOutboxEntries();
    expect(entries.map((e) => e.id)).toEqual(["2"]);
  });

  it("clearAll empties both stores", async () => {
    await putTask(makeTask("a"));
    await putOutboxEntry(makeEntry("1"));
    await clearAll();
    expect(await getAllTasks()).toEqual([]);
    expect(await getAllOutboxEntries()).toEqual([]);
  });
});
