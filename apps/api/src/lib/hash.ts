import { createHash } from "node:crypto";

export function hashRequestBody(body: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(body ?? null))
    .digest("hex");
}
