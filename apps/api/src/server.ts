import Fastify from "fastify";
import { healthRoutes } from "./routes/health.js";

const app = Fastify();

await app.register(healthRoutes);

const rawPort = process.env["PORT"] ?? "3000";
const port = Number(rawPort);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT: "${rawPort}" — must be an integer 1–65535`);
}

try {
  await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log(`Server listening on http://localhost:${port}`);
