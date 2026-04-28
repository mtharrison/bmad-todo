import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fc from "fast-check";
import { buildApp } from "../../apps/api/src/app.js";
import { createDb, type DbHandles } from "../../apps/api/src/db/kysely.js";
import { runMigrations } from "../../apps/api/src/db/migrate.js";
import {
  clearAllTasks,
  createTask,
  deleteTask,
  tasks,
  toggleTaskCompleted,
  updateTaskText,
} from "../../apps/web/src/store/task-store.js";
import { applyUndo, pushUndo, clearUndoStack } from "../../apps/web/src/store/undo-stack.js";
import { drain } from "../../apps/web/src/sync/outbox.js";
import { clearAll } from "../../apps/web/src/sync/idb.js";

interface Harness {
  appBaseFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  closeApp: () => Promise<void>;
}

let originalFetch: typeof globalThis.fetch | undefined;
let networkOnline = true;
let dropNextResponse = false;
let dbHandles: DbHandles | null = null;
let harness: Harness | null = null;

async function makeHarness(): Promise<Harness> {
  dbHandles = createDb(":memory:");
  runMigrations(dbHandles.sqlite);
  const app = await buildApp({ kysely: dbHandles.kysely, rateLimit: false });
  await app.ready();

  const appBaseFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : (input as Request).url;
    const headers = new Headers(init?.headers);
    const headerObj: Record<string, string> = {};
    headers.forEach((v, k) => {
      headerObj[k] = v;
    });
    const res = await app.inject({
      method: (init?.method as "GET" | "POST" | "PATCH" | "DELETE") ?? "GET",
      url,
      headers: headerObj,
      payload: init?.body as string | undefined,
    });
    const respHeaders = new Headers();
    for (const [k, v] of Object.entries(res.headers)) {
      if (typeof v === "string") respHeaders.set(k, v);
    }
    if (res.statusCode === 204) {
      return new Response(null, { status: 204, headers: respHeaders });
    }
    return new Response(res.body, {
      status: res.statusCode,
      headers: respHeaders,
    });
  };

  return {
    appBaseFetch,
    closeApp: async () => {
      await app.close();
    },
  };
}

beforeEach(async () => {
  harness = await makeHarness();
  originalFetch = globalThis.fetch;
  networkOnline = true;
  dropNextResponse = false;
  globalThis.fetch = (input, init) => {
    if (!networkOnline) return Promise.reject(new TypeError("offline"));
    if (dropNextResponse) {
      dropNextResponse = false;
      return Promise.reject(new TypeError("dropped"));
    }
    return harness!.appBaseFetch(input, init);
  };
});

afterEach(async () => {
  if (originalFetch) globalThis.fetch = originalFetch;
  clearAllTasks();
  clearUndoStack();
  await clearAll();
  await harness?.closeApp();
  harness = null;
  dbHandles = null;
});

interface ModelState {
  live: Set<string>;
  deletedIds: string[];
  texts: Map<string, string>;
}

type Command =
  | { kind: "create"; text: string }
  | { kind: "delete"; nth: number }
  | { kind: "toggle"; nth: number }
  | { kind: "updateText"; nth: number; text: string }
  | { kind: "undo" }
  | { kind: "goOffline" }
  | { kind: "goOnline" }
  | { kind: "dropResponse" }
  | { kind: "duplicateReplay" };

async function applyCommand(cmd: Command, model: ModelState): Promise<void> {
  switch (cmd.kind) {
    case "create": {
      const before = tasks.length;
      createTask(cmd.text);
      if (tasks.length > before) {
        const newTask = tasks[0]!;
        model.live.add(newTask.id);
        model.texts.set(newTask.id, newTask.text);
      }
      break;
    }
    case "delete": {
      if (tasks.length === 0) return;
      const idx = cmd.nth % tasks.length;
      const task = tasks[idx]!;
      const id = task.id;
      const snapshot = { ...task };
      pushUndo({
        inverseMutation: { type: "insert", task: snapshot, index: idx },
      });
      deleteTask(id);
      model.live.delete(id);
      model.deletedIds.push(id);
      model.texts.delete(id);
      break;
    }
    case "toggle": {
      if (tasks.length === 0) return;
      const idx = cmd.nth % tasks.length;
      toggleTaskCompleted(tasks[idx]!.id);
      break;
    }
    case "updateText": {
      if (tasks.length === 0) return;
      const idx = cmd.nth % tasks.length;
      const task = tasks[idx]!;
      const prevText = task.text;
      pushUndo({
        inverseMutation: { type: "updateText", id: task.id, previousText: prevText },
      });
      updateTaskText(task.id, cmd.text);
      if (cmd.text.trim().length > 0) {
        model.texts.set(task.id, cmd.text);
      }
      break;
    }
    case "undo": {
      applyUndo();
      // Re-sync model with actual store state
      model.live.clear();
      model.texts.clear();
      for (const t of tasks) {
        model.live.add(t.id);
        model.texts.set(t.id, t.text);
      }
      break;
    }
    case "goOffline":
      networkOnline = false;
      break;
    case "goOnline":
      networkOnline = true;
      break;
    case "dropResponse":
      dropNextResponse = true;
      break;
    case "duplicateReplay": {
      // Force a drain attempt which may replay already-applied mutations
      try {
        await drain();
      } catch {
        // drain is resilient
      }
      break;
    }
  }
}

async function drainUntilQuiet(maxRounds = 10): Promise<void> {
  for (let i = 0; i < maxRounds; i++) {
    const r = await drain();
    if (r.remaining === 0) return;
    if (r.applied === 0 && r.rejected === 0) return;
  }
}

async function fetchServerIds(): Promise<Set<string>> {
  const res = await harness!.appBaseFetch("/tasks", { method: "GET" });
  const list = (await res.json()) as Array<{ id: string }>;
  return new Set(list.map((t) => t.id));
}

const validText = fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0);

const commandArb: fc.Arbitrary<Command> = fc.oneof(
  { weight: 5, arbitrary: fc.record({ kind: fc.constant("create" as const), text: validText }) },
  { weight: 3, arbitrary: fc.record({ kind: fc.constant("delete" as const), nth: fc.nat(20) }) },
  { weight: 3, arbitrary: fc.record({ kind: fc.constant("toggle" as const), nth: fc.nat(20) }) },
  {
    weight: 3,
    arbitrary: fc.record({
      kind: fc.constant("updateText" as const),
      nth: fc.nat(20),
      text: validText,
    }),
  },
  { weight: 2, arbitrary: fc.record({ kind: fc.constant("undo" as const) }) },
  { weight: 2, arbitrary: fc.record({ kind: fc.constant("goOffline" as const) }) },
  { weight: 2, arbitrary: fc.record({ kind: fc.constant("goOnline" as const) }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant("dropResponse" as const) }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant("duplicateReplay" as const) }) },
);

describe("sync invariants (property-based)", () => {
  it("never duplicates and never loses tasks across random offline/online cycles", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(commandArb, { minLength: 1, maxLength: 1000 }),
        async (commands) => {
          clearAllTasks();
          clearUndoStack();
          await clearAll();
          networkOnline = true;
          dropNextResponse = false;
          if (dbHandles) {
            await dbHandles.kysely.deleteFrom("tasks").execute();
            await dbHandles.kysely.deleteFrom("idempotency_keys").execute();
          }

          const model: ModelState = { live: new Set(), deletedIds: [], texts: new Map() };
          for (const cmd of commands) {
            await applyCommand(cmd, model);
          }
          // Reconnect, drain to quiet
          networkOnline = true;
          dropNextResponse = false;
          await drainUntilQuiet();

          const serverIds = await fetchServerIds();

          // Never lose: every locally-live id is present on the server.
          for (const id of model.live) {
            expect(serverIds.has(id)).toBe(true);
          }
          // Never duplicate: server has exactly the live set after full drain.
          expect(serverIds.size).toBe(model.live.size);
        },
      ),
      { numRuns: 20 },
    );
  }, 120_000);
});
