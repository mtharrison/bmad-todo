import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { env } from "../env.js";

export interface RateLimitOptions {
  max?: number;
  timeWindow?: string;
}

export async function registerRateLimit(
  app: FastifyInstance,
  opts: RateLimitOptions = {},
): Promise<void> {
  // Production limit per architecture; relaxed in development so the e2e suite
  // (which makes hundreds of requests per run) does not hit the cap.
  const defaultMax = env.NODE_ENV === "production" ? 100 : 10_000;
  await app.register(rateLimit, {
    max: opts.max ?? defaultMax,
    timeWindow: opts.timeWindow ?? "1 minute",
    keyGenerator: (req) => req.userNamespace ?? "default",
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: { code: "RateLimited", message: "Rate limit exceeded" },
    }),
  });
}
