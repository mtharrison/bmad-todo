import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";
import { createDb } from "./db/kysely.js";
import { runMigrations } from "./db/migrate.js";
import { env } from "./env.js";
import { log } from "./lib/log.js";

const HERE = dirname(fileURLToPath(import.meta.url));

const { kysely, sqlite } = createDb(env.DATABASE_URL);
runMigrations(sqlite);

const staticRoot =
  env.NODE_ENV === "production" ? join(HERE, "..", "..", "web", "dist") : undefined;
const app = await buildApp({ kysely, rateLimit: true, helmet: true, staticRoot, logger: true });

try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  log.info({ event: "server.listening", port: env.PORT });
} catch (err) {
  log.error({ event: "server.start_failed", err });
  process.exit(1);
}
