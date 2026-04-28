import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z
    .string()
    .default("3000")
    .transform((s) => Number(s))
    .pipe(z.number().int().min(1).max(65535)),
  DATABASE_URL: z.string().min(1).default("./data/dev.db"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

export type Env = z.infer<typeof Env>;

function parseEnv(): Env {
  const raw = {
    NODE_ENV: process.env["NODE_ENV"],
    PORT: process.env["PORT"],
    DATABASE_URL:
      process.env["DATABASE_URL"] ?? (process.env["NODE_ENV"] === "test" ? ":memory:" : undefined),
    LOG_LEVEL: process.env["LOG_LEVEL"],
  };
  return Env.parse(raw);
}

export const env = parseEnv();
