import { join } from "node:path";
import { readFileSync } from "node:fs";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyStatic from "@fastify/static";

export async function registerStatic(app: FastifyInstance, webDistRoot: string): Promise<void> {
  await app.register(fastifyStatic, {
    root: webDistRoot,
    prefix: "/",
    decorateReply: false,
    cacheControl: false,
    setHeaders(res, filePath) {
      if (filePath.includes("/assets/")) {
        res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
      } else {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  });

  const indexHtml = readFileSync(join(webDistRoot, "index.html"), "utf8");

  app.setNotFoundHandler((_req: FastifyRequest, reply: FastifyReply) => {
    const url = _req.url;
    if (url.startsWith("/tasks") || url.startsWith("/health") || url.startsWith("/admin")) {
      void reply.status(404).send({ error: { code: "NotFound", message: "Route not found" } });
      return;
    }
    void reply
      .header("Content-Type", "text/html; charset=utf-8")
      .header("Cache-Control", "no-cache")
      .status(200)
      .send(indexHtml);
  });
}
