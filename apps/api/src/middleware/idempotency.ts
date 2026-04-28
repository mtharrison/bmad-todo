import type { FastifyReply, FastifyRequest } from "fastify";
import type { IdempotencyRepo } from "../db/repos/idempotency-repo.js";
import { hashRequestBody } from "../lib/hash.js";
import { log } from "../lib/log.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function makeIdempotencyHook(repo: IdempotencyRepo) {
  return async function idempotencyHook(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const headerVal = req.headers["idempotency-key"];
    const key = Array.isArray(headerVal) ? headerVal[0] : headerVal;

    if (!key) {
      await reply.status(400).send({
        error: {
          code: "ValidationError",
          message: "Idempotency-Key header is required",
        },
      });
      return;
    }

    if (!UUID_RE.test(key)) {
      await reply.status(400).send({
        error: {
          code: "ValidationError",
          message: "Idempotency-Key must be a UUID",
        },
      });
      return;
    }

    const requestHash = hashRequestBody(req.body);
    const cached = await repo.find(key, req.userNamespace);

    if (cached) {
      if (cached.requestHash === requestHash) {
        log.info({
          event: "idempotency.replayed",
          key,
          userNamespace: req.userNamespace,
        });
        const status = cached.responseStatus;
        if (status === 204 || cached.responseBody === "") {
          await reply.status(status).send();
        } else {
          await reply
            .status(status)
            .header("content-type", "application/json")
            .send(cached.responseBody);
        }
        return;
      }
      await reply.status(409).send({
        error: {
          code: "Conflict",
          message: "Idempotency-Key replayed with a different request body",
        },
      });
      return;
    }

    req.idempotencyKey = key;
    req.idempotencyRequestHash = requestHash;
  };
}
