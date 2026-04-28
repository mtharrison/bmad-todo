import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mutation } from "@bmad-todo/shared";
import {
  drain,
  enqueue,
  getOutboxSize,
  setSyncObserver,
} from "./outbox";
import {
  _resetForTesting,
  getAllOutboxEntries,
  getAllTasks,
} from "./idb";

function jsonResponse(status: number, body: unknown): Response {
  const headers = new Headers({ "content-type": "application/json" });
  return new Response(
    status === 204 ? null : JSON.stringify(body ?? null),
    { status, headers },
  );
}

function createMutation(id: string, text = "task"): Mutation {
  return {
    type: "create",
    id,
    text,
    createdAt: 1,
    idempotencyKey: `key-${id}`,
  };
}

function deleteMutation(id: string): Mutation {
  return { type: "delete", id, idempotencyKey: `del-${id}` };
}

function serverTaskFor(id: string, text: string) {
  return {
    id,
    userNamespace: "default",
    text,
    completedAt: null,
    createdAt: 1,
    updatedAt: 2,
  };
}

beforeEach(async () => {
  await _resetForTesting();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase("bmad-todo");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  setSyncObserver(null);
});

describe("sync/outbox", () => {
  it("FIFO order across mixed types", async () => {
    const calls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url =
        typeof input === "string" ? input : (input as Request).url;
      calls.push(url);
      if (url === "/tasks") {
        return jsonResponse(201, serverTaskFor("a", "first"));
      }
      return jsonResponse(204, null);
    });
    await enqueue(createMutation("a", "first"));
    await enqueue(deleteMutation("a"));
    const r = await drain();
    expect(r.applied).toBe(2);
    expect(r.remaining).toBe(0);
    expect(calls.map((u) => u.startsWith("/tasks"))).toEqual([true, true]);
  });

  it("5xx leaves entry in outbox with attempts++", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(500, { error: { code: "ServerError", message: "boom" } }),
    );
    await enqueue(createMutation("a"));
    await drain();
    const left = await getAllOutboxEntries();
    expect(left.length).toBe(1);
    expect(left[0]?.attempts).toBe(1);
    expect(left[0]?.nextAttemptAt).toBeGreaterThan(Date.now() - 100);
  });

  it("2xx removes entry and updates cache", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(201, serverTaskFor("a", "x")),
    );
    await enqueue(createMutation("a", "x"));
    await drain();
    expect(await getOutboxSize()).toBe(0);
    expect(await getAllTasks()).toEqual([
      expect.objectContaining({ id: "a", text: "x" }),
    ]);
  });

  it("4xx drops entry and continues", async () => {
    let n = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      n += 1;
      if (n === 1) {
        return jsonResponse(409, {
          error: { code: "Conflict", message: "k mismatch" },
        });
      }
      return jsonResponse(201, serverTaskFor("b", "ok"));
    });
    await enqueue(createMutation("a", "first"));
    await enqueue(createMutation("b", "ok"));
    const r = await drain();
    expect(r.applied).toBe(1);
    expect(r.rejected).toBe(1);
    expect(await getOutboxSize()).toBe(0);
  });

  it("emits 'offline' on 5xx and 'online' after a successful drain", async () => {
    const states: string[] = [];
    setSyncObserver((s) => states.push(s));

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse(500, { error: { code: "ServerError", message: "boom" } }),
    );
    await enqueue(createMutation("a"));
    await drain();
    expect(states).toContain("offline");

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(201, serverTaskFor("a", "x")),
    );
    // Force the entry's nextAttemptAt into the past so drain proceeds.
    const list = await getAllOutboxEntries();
    if (list.length === 1) {
      const updated = { ...list[0]!, nextAttemptAt: 0 };
      const { putOutboxEntry } = await import("./idb");
      await putOutboxEntry(updated);
    }
    await drain();
    expect(states).toContain("online");
  });
});
