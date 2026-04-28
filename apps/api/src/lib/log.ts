import pino from "pino";
import { env } from "../env.js";

export const log = pino({
  level: env.NODE_ENV === "test" ? "silent" : env.LOG_LEVEL,
  redact: {
    paths: ["*.text", "*.body.text", "req.body.text"],
    censor: "[REDACTED]",
  },
});
