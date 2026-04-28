import type { FastifyInstance, FastifyRequest } from "fastify";
import { env } from "../env.js";

export async function authJwt(req: FastifyRequest): Promise<void> {
  if (env.NODE_ENV === "production") {
    // TODO(Story-1.13): verify Cf-Access-Jwt-Assertion against the team JWKS.
    throw new Error(
      "auth-jwt: production mode not yet implemented (Story 1.13)",
    );
  }
  req.userNamespace = "default";
}

export function registerAuth(app: FastifyInstance): void {
  app.decorateRequest("userNamespace", "");
  app.decorateRequest("idempotencyKey", undefined);
  app.decorateRequest("idempotencyRequestHash", undefined);
  app.addHook("onRequest", authJwt);
}
