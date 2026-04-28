import type { FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";

const THEME_SCRIPT_HASH = "'sha256-XcOGGHHB3/PoouLBTz3BQP1U56+jNFeAys7Dv0aFer0='";

export async function registerHelmet(app: FastifyInstance): Promise<void> {
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", THEME_SCRIPT_HASH],
        styleSrc: ["'self'", "'unsafe-inline'"],
        workerSrc: ["'self'"],
        connectSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        fontSrc: ["'self'"],
        frameAncestors: ["'none'"],
        manifestSrc: ["'self'"],
      },
    },
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "no-referrer" },
  });
}
