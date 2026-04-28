import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { buildApp } from "../app.js";
import { createDb } from "../db/kysely.js";
import { runMigrations } from "../db/migrate.js";

const FIXTURE_DIR = join(import.meta.dirname, "__test-static__");
const WEB_DIST = join(FIXTURE_DIR, "web", "dist");
const ASSETS_DIR = join(WEB_DIST, "assets");

beforeAll(() => {
  mkdirSync(ASSETS_DIR, { recursive: true });
  writeFileSync(join(WEB_DIST, "index.html"), "<html><body>SPA</body></html>");
  writeFileSync(join(ASSETS_DIR, "index-abc123.js"), "console.log('app')");
  writeFileSync(join(ASSETS_DIR, "index-abc123.css"), "body{}");
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

async function setup() {
  const h = createDb(":memory:");
  runMigrations(h.sqlite);
  const app = await buildApp({ kysely: h.kysely, staticRoot: WEB_DIST });
  await app.ready();
  return app;
}

describe("static file serving for SPA", () => {
  it("serves index.html at /", async () => {
    const app = await setup();
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("SPA");
  });

  it("serves index.html with no-cache header", async () => {
    const app = await setup();
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.headers["cache-control"]).toContain("no-cache");
  });

  it("serves hashed assets with immutable cache", async () => {
    const app = await setup();
    const res = await app.inject({ method: "GET", url: "/assets/index-abc123.js" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["cache-control"]).toContain("immutable");
  });

  it("falls back to index.html for unknown non-API paths (SPA routing)", async () => {
    const app = await setup();
    const res = await app.inject({ method: "GET", url: "/some/spa/route" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("SPA");
  });

  it("does not serve index.html for API routes", async () => {
    const app = await setup();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("does not register static serving when staticRoot is not provided", async () => {
    const h = createDb(":memory:");
    runMigrations(h.sqlite);
    const app = await buildApp({ kysely: h.kysely });
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(404);
  });
});
