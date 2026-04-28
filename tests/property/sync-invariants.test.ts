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
} from "../../apps/web/src/store/task-store.js";
import { drain } from "../../apps/web/src/sync/outbox.js";
import { clearAll } from "../../apps/web/src/sync/idb.js";

interface Harness {
  appBaseFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  closeApp: () => Promise<void>;
}

let originalFetch: typeof globalThis.fetch | undefined;
let networkOnline = true;
let dbHandles: DbHandles | null = null;
let harness: Harness | null = null;

async function makeHarness(): Promise<Harness> {
  dbHandles = createDb(":memory:");
  runMigrations(dbHandles.sqlite);
  const app = await buildApp({ kysely: dbHandles.kysely, rateLimit: false });
  await app.ready();

  const appBaseFetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
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
  globalThis.fetch = (input, init) => {
    if (!networkOnline) return Promise.reject(new TypeError("offline"));
    return harness!.appBaseFetch(input, init);
  };
});

afterEach(async () => {
  if (originalFetch) globalThis.fetch = originalFetch;
  clearAllTasks();
  await clearAll();
  await harness?.closeApp();
  harness = null;
  dbHandles = null;
});

interface ModelState {
  live: Set<string>;
}

type Command =
  | { kind: "create"; text: string }
  | { kind: "delete"; nth: number }
  | { kind: "toggle"; nth: number }
  | { kind: "goOffline" }
  | { kind: "goOnline" };

async function applyCommand(cmd: Command, model: ModelState): Promise<void> {
  switch (cmd.kind) {
    case "create": {
      const before = tasks.length;
      createTask(cmd.text);
      if (tasks.length > before) {
        const newId = tasks[0]!.id;
        model.live.add(newId);
      }
      break;
    }
    case "delete": {
      if (tasks.length === 0) return;
      const idx = cmd.nth % tasks.length;
      const id = tasks[idx]!.id;
      deleteTask(id);
      model.live.delete(id);
      break;
    }
    case "toggle": {
      if (tasks.length === 0) return;
      const idx = cmd.nth % tasks.length;
      toggleTaskCompleted(tasks[idx]!.id);
      break;
    }
    case "goOffline":
      networkOnline = false;
      break;
    case "goOnline":
      networkOnline = true;
      break;
  }
}

async function drainUntilQuiet(maxRounds = 6): Promise<void> {
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

const commandArb: fc.Arbitrary<Command> = fc.oneof(
  fc.record({
    kind: fc.constant("create" as const),
    text: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
  }),
  fc.record({ kind: fc.constant("delete" as const), nth: fc.nat(20) }),
  fc.record({ kind: fc.constant("toggle" as const), nth: fc.nat(20) }),
  fc.record({ kind: fc.constant("goOffline" as const) }),
  fc.record({ kind: fc.constant("goOnline" as const) }),
);

describe("sync invariants (property-based)", () => {
  it("never duplicates and never loses tasks across random offline/online cycles", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(commandArb, { minLength: 1, maxLength: 60 }),
        async (commands) => {
          // Reset between runs
          clearAllTasks();
          await clearAll();
          networkOnline = true;
          if (dbHandles) {
            // Wipe rows but keep schema
            await dbHandles.kysely.deleteFrom("tasks").execute();
            await dbHandles.kysely.deleteFrom("idempotency_keys").execute();
          }

          const model: ModelState = { live: new Set() };
          for (const cmd of commands) {
            await applyCommand(cmd, model);
          }
          // Reconnect, drain to quiet
          networkOnline = true;
          await drainUntilQuiet();

          const serverIds = await fetchServerIds();

          // Never duplicate: the server has at most one row per live id.
          // Never lose: every locally-live id is present on the server.
          for (const id of model.live) {
            expect(serverIds.has(id)).toBe(true);
          }
          // The server may also contain ids that were created and then deleted
          // before the delete reached the server only if the delete is still
          // pending. After drainUntilQuiet, no entries should remain so the
          // server reflects exactly model.live.
          expect(serverIds.size).toBe(model.live.size);
        },
      ),
      { numRuns: 20 },
    );
  }, 60_000);
});
