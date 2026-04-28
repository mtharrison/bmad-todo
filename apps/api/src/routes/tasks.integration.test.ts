import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { createDb, type DbHandles } from "../db/kysely.js";
import { runMigrations } from "../db/migrate.js";
import { TasksRepo } from "../db/repos/tasks-repo.js";

interface TestCtx {
  app: FastifyInstance;
  h: DbHandles;
}

async function setup(rateLimit: boolean | { max: number } = false): Promise<TestCtx> {
  const h = createDb(":memory:");
  runMigrations(h.sqlite);
  const app = await buildApp({ kysely: h.kysely, rateLimit });
  await app.ready();
  return { app, h };
}

function uuid(): string {
  return randomUUID();
}

function createBody(overrides: Partial<{ id: string; text: string; createdAt: number }> = {}) {
  return {
    id: overrides.id ?? uuid(),
    text: overrides.text ?? "test task",
    createdAt: overrides.createdAt ?? Date.now(),
  };
}

describe("tasks routes — integration", () => {
  let ctx: TestCtx;

  beforeEach(async () => {
    ctx = await setup();
  });

  describe("POST /tasks", () => {
    it("creates a task and returns 201", async () => {
      const key = uuid();
      const body = createBody({ text: "buy milk" });
      const res = await ctx.app.inject({
        method: "POST",
        url: "/tasks",
        headers: { "idempotency-key": key, "content-type": "application/json" },
        payload: body,
      });
      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.text).toBe("buy milk");
      expect(json.userNamespace).toBe("default");
      expect(json.completedAt).toBeNull();
    });

    it("idempotent — same key, same body returns cached response and creates only one row", async () => {
      const key = uuid();
      const body = createBody();
      const first = await ctx.app.inject({
        method: "POST",
        url: "/tasks",
        headers: { "idempotency-key": key, "content-type": "application/json" },
        payload: body,
      });
      const second = await ctx.app.inject({
        method: "POST",
        url: "/tasks",
        headers: { "idempotency-key": key, "content-type": "application/json" },
        payload: body,
      });
      expect(first.statusCode).toBe(201);
      expect(second.statusCode).toBe(201);
      expect(second.json()).toEqual(first.json());
      const list = await new TasksRepo(ctx.h.kysely).listActive("default");
      expect(list.length).toBe(1);
    });

    it("same key, different body returns 409", async () => {
      const key = uuid();
      const first = await ctx.app.inject({
        method: "POST",
        url: "/tasks",
        headers: { "idempotency-key": key, "content-type": "application/json" },
        payload: createBody({ text: "first" }),
      });
      expect(first.statusCode).toBe(201);
      const second = await ctx.app.inject({
        method: "POST",
        url: "/tasks",
        headers: { "idempotency-key": key, "content-type": "application/json" },
        payload: createBody({ text: "different" }),
      });
      expect(second.statusCode).toBe(409);
      expect(second.json().error.code).toBe("Conflict");
    });

    it("returns 400 when Idempotency-Key header is missing", async () => {
      const res = await ctx.app.inject({
        method: "POST",
        url: "/tasks",
        headers: { "content-type": "application/json" },
        payload: createBody(),
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("ValidationError");
    });

    it("rejects oversized text with 400", async () => {
      const res = await ctx.app.inject({
        method: "POST",
        url: "/tasks",
        headers: { "idempotency-key": uuid(), "content-type": "application/json" },
        payload: createBody({ text: "a".repeat(10_001) }),
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("ValidationError");
    });
  });

  describe("PATCH /tasks/:id", () => {
    it("updates text", async () => {
      const id = uuid();
      await ctx.app.inject({
        method: "POST",
        url: "/tasks",
        headers: { "idempotency-key": uuid(), "content-type": "application/json" },
        payload: createBody({ id, text: "old" }),
      });
      const res = await ctx.app.inject({
        method: "PATCH",
        url: `/tasks/${id}`,
        headers: { "idempotency-key": uuid(), "content-type": "application/json" },
        payload: { text: "new" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().text).toBe("new");
    });

    it("idempotent under same-key replay", async () => {
      const id = uuid();
      await ctx.app.inject({
        method: "POST",
        url: "/tasks",
        headers: { "idempotency-key": uuid(), "content-type": "application/json" },
        payload: createBody({ id, text: "old" }),
      });
      const key = uuid();
      const first = await ctx.app.inject({
        method: "PATCH",
        url: `/tasks/${id}`,
        headers: { "idempotency-key": key, "content-type": "application/json" },
        payload: { text: "new" },
      });
      const second = await ctx.app.inject({
        method: "PATCH",
        url: `/tasks/${id}`,
        headers: { "idempotency-key": key, "content-type": "application/json" },
        payload: { text: "new" },
      });
      expect(first.statusCode).toBe(200);
      expect(second.statusCode).toBe(200);
      expect(second.json()).toEqual(first.json());
    });

    it("returns 404 when task is missing", async () => {
      const res = await ctx.app.inject({
        method: "PATCH",
        url: `/tasks/${uuid()}`,
        headers: { "idempotency-key": uuid(), "content-type": "application/json" },
        payload: { text: "x" },
      });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("NotFound");
    });
  });

  describe("DELETE /tasks/:id", () => {
    it("soft-deletes; subsequent GET excludes it", async () => {
      const id = uuid();
      await ctx.app.inject({
        method: "POST",
        url: "/tasks",
        headers: { "idempotency-key": uuid(), "content-type": "application/json" },
        payload: createBody({ id }),
      });
      const del = await ctx.app.inject({
        method: "DELETE",
        url: `/tasks/${id}`,
        headers: { "idempotency-key": uuid() },
      });
      expect(del.statusCode).toBe(204);
      const list = await ctx.app.inject({ method: "GET", url: "/tasks" });
      expect(list.json().length).toBe(0);
    });

    it("idempotent under same-key replay", async () => {
      const id = uuid();
      await ctx.app.inject({
        method: "POST",
        url: "/tasks",
        headers: { "idempotency-key": uuid(), "content-type": "application/json" },
        payload: createBody({ id }),
      });
      const key = uuid();
      const a = await ctx.app.inject({
        method: "DELETE",
        url: `/tasks/${id}`,
        headers: { "idempotency-key": key },
      });
      const b = await ctx.app.inject({
        method: "DELETE",
        url: `/tasks/${id}`,
        headers: { "idempotency-key": key },
      });
      expect(a.statusCode).toBe(204);
      expect(b.statusCode).toBe(204);
    });
  });

  describe("GET /tasks", () => {
    it("returns rows newest-first", async () => {
      const ids = ["01HZ-0", "01HZ-1", "01HZ-2"];
      for (const id of ids) {
        await ctx.app.inject({
          method: "POST",
          url: "/tasks",
          headers: { "idempotency-key": uuid(), "content-type": "application/json" },
          payload: createBody({ id }),
        });
      }
      const res = await ctx.app.inject({ method: "GET", url: "/tasks" });
      const body = res.json() as Array<{ id: string }>;
      expect(body.map((t) => t.id)).toEqual([...ids].reverse());
    });

    it("filters by user_namespace (default only)", async () => {
      // Insert directly into another namespace via the repo bypassing the route,
      // since auth-jwt always sets req.userNamespace = "default".
      const repo = new TasksRepo(ctx.h.kysely);
      await repo.create({
        id: uuid(),
        userNamespace: "alice",
        text: "alice secret",
        createdAt: 1,
      });
      const res = await ctx.app.inject({ method: "GET", url: "/tasks" });
      expect(res.json()).toEqual([]);
    });
  });

  describe("rate limit", () => {
    it("returns 429 after 100 req/min/namespace", async () => {
      const rl = await setup({ max: 100 });
      try {
        // Issue 101 requests; first 100 succeed, 101st returns 429
        let last: { statusCode: number; body: string } = { statusCode: 0, body: "" };
        for (let i = 0; i < 101; i++) {
          const r = await rl.app.inject({ method: "GET", url: "/tasks" });
          last = { statusCode: r.statusCode, body: r.body };
        }
        expect(last.statusCode).toBe(429);
      } finally {
        await rl.app.close();
      }
    });
  });
});
