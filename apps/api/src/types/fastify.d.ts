import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    userNamespace: string;
    idempotencyKey?: string;
    idempotencyRequestHash?: string;
  }
}
