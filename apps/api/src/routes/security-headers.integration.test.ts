import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { buildApp } from "../app.js";
import { createDb } from "../db/kysely.js";
import { runMigrations } from "../db/migrate.js";

const FIXTURE_DIR = join(import.meta.dirname, "__test-secheaders__");
const WEB_DIST = join(FIXTURE_DIR, "web", "dist");

beforeAll(() => {
  mkdirSync(join(WEB_DIST, "assets"), { recursive: true });
  writeFileSync(join(WEB_DIST, "index.html"), "<html><body>test</body></html>");
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

describe("security headers integration", () => {
  async function setup() {
    const h = createDb(":memory:");
    runMigrations(h.sqlite);
    const app = await buildApp({ kysely: h.kysely, helmet: true, staticRoot: WEB_DIST });
    await app.ready();
    return app;
  }

  it("GET / returns CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy", async () => {
    const app = await setup();
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
  });

  it("GET /health returns security headers", async () => {
    const app = await setup();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(res.headers["x-frame-options"]).toBe("DENY");
  });
});
