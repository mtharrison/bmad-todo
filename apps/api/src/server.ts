import { buildApp } from "./app.js";
import { createDb } from "./db/kysely.js";
import { runMigrations } from "./db/migrate.js";
import { env } from "./env.js";
import { log } from "./lib/log.js";

const { kysely, sqlite } = createDb(env.DATABASE_URL);
runMigrations(sqlite);

const app = await buildApp({ kysely, rateLimit: true, logger: true });

try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  log.info({ event: "server.listening", port: env.PORT });
} catch (err) {
  log.error({ event: "server.start_failed", err });
  process.exit(1);
}
