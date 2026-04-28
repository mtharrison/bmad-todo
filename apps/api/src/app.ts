import Fastify, { type FastifyInstance } from "fastify";
import type { Kysely } from "kysely";
import type { DB } from "./db/kysely.js";
import { TasksRepo } from "./db/repos/tasks-repo.js";
import { IdempotencyRepo } from "./db/repos/idempotency-repo.js";
import { taskRoutes } from "./routes/tasks.js";
import { healthRoutes } from "./routes/health.js";
import { registerAuth } from "./middleware/auth-jwt.js";
import { errorEnvelope, notFoundHandler } from "./middleware/error-envelope.js";
import { registerRateLimit, type RateLimitOptions } from "./middleware/rate-limit.js";
import { env } from "./env.js";

export interface BuildAppOptions {
  kysely: Kysely<DB>;
  rateLimit?: boolean | RateLimitOptions;
  logger?: boolean;
}

export async function buildApp(opts: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false });

  registerAuth(app);
  if (opts.rateLimit) {
    const rl = typeof opts.rateLimit === "object" ? opts.rateLimit : undefined;
    await registerRateLimit(app, rl);
  }

  app.setErrorHandler(errorEnvelope);
  app.setNotFoundHandler(notFoundHandler);

  await app.register(healthRoutes);
  await app.register(async (scope) => {
    await taskRoutes(scope, {
      tasksRepo: new TasksRepo(opts.kysely),
      idempotencyRepo: new IdempotencyRepo(opts.kysely),
      kysely: opts.kysely,
    });
  });

  // Test-only reset endpoint — gated to non-production. Used by Playwright
  // to wipe state between e2e tests. Never reachable in production deploys.
  if (env.NODE_ENV !== "production") {
    app.post("/admin/reset", async (_req, reply) => {
      await opts.kysely.deleteFrom("tasks").execute();
      await opts.kysely.deleteFrom("idempotency_keys").execute();
      return reply.status(204).send();
    });
  }

  return app;
}
