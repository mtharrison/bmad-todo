import { describe, it, expect, vi, afterEach } from "vitest";
import Fastify from "fastify";

describe("auth-jwt middleware", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  async function buildTestApp(envOverrides: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(envOverrides)) {
      process.env[k] = v;
    }
    const { env } = await import("../env.js");
    const { registerAuth, authJwt } = await import("./auth-jwt.js");

    const app = Fastify();
    registerAuth(app);
    app.get("/test", async (req) => ({ ns: req.userNamespace }));
    await app.ready();
    return { app, env, authJwt };
  }

  it("sets userNamespace to 'default' in development", async () => {
    const { app } = await buildTestApp({ NODE_ENV: "development" });
    const res = await app.inject({ method: "GET", url: "/test" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ns: "default" });
  });

  it("sets userNamespace to 'default' in test", async () => {
    const { app } = await buildTestApp({ NODE_ENV: "test" });
    const res = await app.inject({ method: "GET", url: "/test" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ns: "default" });
  });

  it("returns 403 when production and Cf-Access-Jwt-Assertion header is missing", async () => {
    const { app } = await buildTestApp({
      NODE_ENV: "production",
      CF_TEAM_DOMAIN: "https://myteam.cloudflareaccess.com",
      CF_ACCESS_AUD: "test-aud-value",
    });
    const res = await app.inject({ method: "GET", url: "/test" });
    expect(res.statusCode).toBe(403);
  });

  it("returns 403 when production and JWT is invalid", async () => {
    const { app } = await buildTestApp({
      NODE_ENV: "production",
      CF_TEAM_DOMAIN: "https://myteam.cloudflareaccess.com",
      CF_ACCESS_AUD: "test-aud-value",
    });
    const res = await app.inject({
      method: "GET",
      url: "/test",
      headers: { "cf-access-jwt-assertion": "invalid.jwt.token" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("falls back to default namespace when CF vars unset in production", async () => {
    const { app } = await buildTestApp({ NODE_ENV: "production" });
    const res = await app.inject({ method: "GET", url: "/test" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ns: "default" });
  });
});
