import Fastify from "fastify";
import { healthRoutes } from "./routes/health.js";

const app = Fastify();

await app.register(healthRoutes);

const port = Number(process.env["PORT"] ?? 3000);

await app.listen({ port, host: "0.0.0.0" });

// eslint-disable-next-line no-console
console.log(`Server listening on http://localhost:${port}`);
