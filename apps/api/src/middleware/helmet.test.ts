import { describe, it, expect } from "vitest";
import { buildApp } from "../app.js";
import { createDb } from "../db/kysely.js";
import { runMigrations } from "../db/migrate.js";

async function setup() {
  const h = createDb(":memory:");
  runMigrations(h.sqlite);
  const app = await buildApp({ kysely: h.kysely, helmet: true });
  await app.ready();
  return app;
}

describe("security headers via helmet", () => {
  it("includes Content-Security-Policy header", async () => {
    const app = await setup();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const csp = res.headers["content-security-policy"];
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("includes X-Frame-Options DENY", async () => {
    const app = await setup();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.headers["x-frame-options"]).toBe("DENY");
  });

  it("includes X-Content-Type-Options nosniff", async () => {
    const app = await setup();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("includes Referrer-Policy no-referrer", async () => {
    const app = await setup();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
  });

  it("includes Strict-Transport-Security header", async () => {
    const app = await setup();
    const res = await app.inject({ method: "GET", url: "/health" });
    const hsts = res.headers["strict-transport-security"];
    expect(hsts).toBeDefined();
    expect(hsts).toContain("max-age=63072000");
    expect(hsts).toContain("includeSubDomains");
    expect(hsts).toContain("preload");
  });

  it("does not include security headers when helmet is disabled", async () => {
    const h = createDb(":memory:");
    runMigrations(h.sqlite);
    const app = await buildApp({ kysely: h.kysely });
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.headers["content-security-policy"]).toBeUndefined();
    expect(res.headers["x-frame-options"]).toBeUndefined();
  });
});
