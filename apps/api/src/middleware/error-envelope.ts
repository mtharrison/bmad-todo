import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { log } from "../lib/log.js";

export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  readonly statusCode = 409;
  constructor(message = "Conflict") {
    super(message);
    this.name = "ConflictError";
  }
}

export class ValidationError extends Error {
  readonly statusCode = 400;
  constructor(message = "Validation failed") {
    super(message);
    this.name = "ValidationError";
  }
}

interface RateLimitedError {
  statusCode?: number;
  message?: string;
}

function isRateLimited(err: unknown): err is RateLimitedError {
  return (
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    (err as { statusCode?: number }).statusCode === 429
  );
}

export function errorEnvelope(
  err: FastifyError | Error,
  req: FastifyRequest,
  reply: FastifyReply,
): void {
  if (err instanceof ZodError) {
    const message = err.issues[0]?.message ?? "Validation failed";
    void reply.status(400).send({
      error: { code: "ValidationError", message },
    });
    return;
  }

  if (err instanceof ValidationError) {
    void reply.status(400).send({
      error: { code: "ValidationError", message: err.message },
    });
    return;
  }

  if (err instanceof NotFoundError) {
    void reply.status(404).send({
      error: { code: "NotFound", message: err.message },
    });
    return;
  }

  if (err instanceof ConflictError) {
    void reply.status(409).send({
      error: { code: "Conflict", message: err.message },
    });
    return;
  }

  if (isRateLimited(err)) {
    void reply.status(429).send({
      error: {
        code: "RateLimited",
        message: err.message ?? "Rate limit exceeded",
      },
    });
    return;
  }

  // Fastify schema validation errors
  const fe = err as FastifyError;
  if (fe.validation) {
    void reply.status(400).send({
      error: { code: "ValidationError", message: fe.message },
    });
    return;
  }

  log.error({ event: "server.error", err: serializeError(err), path: req.url });
  void reply.status(500).send({
    error: { code: "ServerError", message: "Internal server error" },
  });
}

export function notFoundHandler(_req: FastifyRequest, reply: FastifyReply): void {
  void reply.status(404).send({
    error: { code: "NotFound", message: "Route not found" },
  });
}

function serializeError(err: unknown): object {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { value: String(err) };
}
