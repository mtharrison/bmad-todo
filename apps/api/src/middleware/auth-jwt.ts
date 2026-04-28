import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { env } from "../env.js";
import { log } from "../lib/log.js";

let jwks: JWTVerifyGetKey | undefined;
let warnedAuthBypass = false;

export async function authJwt(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (env.NODE_ENV !== "production") {
    req.userNamespace = "default";
    return;
  }

  if (!env.CF_TEAM_DOMAIN || !env.CF_ACCESS_AUD) {
    if (!warnedAuthBypass) {
      log.warn("CF_TEAM_DOMAIN or CF_ACCESS_AUD not set — auth is disabled");
      warnedAuthBypass = true;
    }
    req.userNamespace = "default";
    return;
  }

  const token = req.headers["cf-access-jwt-assertion"];
  if (typeof token !== "string" || !token) {
    void reply.status(403).send({ error: { code: "Forbidden", message: "Missing access token" } });
    return;
  }

  const teamDomain = env.CF_TEAM_DOMAIN.replace(/\/+$/, "");
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: teamDomain,
      audience: env.CF_ACCESS_AUD,
    });
    req.userNamespace = (payload.sub as string) ?? "default";
  } catch {
    void reply.status(403).send({ error: { code: "Forbidden", message: "Invalid access token" } });
    return;
  }
}

export function registerAuth(app: FastifyInstance): void {
  app.decorateRequest("userNamespace", "");
  app.decorateRequest("idempotencyKey", undefined);
  app.decorateRequest("idempotencyRequestHash", undefined);
  app.addHook("onRequest", authJwt);
}
