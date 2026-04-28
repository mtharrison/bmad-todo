import type { Kysely } from "kysely";
import type { DB } from "../kysely.js";

export interface CachedResponse {
  requestHash: string;
  responseStatus: number;
  responseBody: string;
}

export class IdempotencyRepo {
  constructor(private readonly db: Kysely<DB>) {}

  async find(
    key: string,
    userNamespace: string,
  ): Promise<CachedResponse | null> {
    const row = await this.db
      .selectFrom("idempotency_keys")
      .select(["request_hash", "response_status", "response_body"])
      .where("key", "=", key)
      .where("user_namespace", "=", userNamespace)
      .executeTakeFirst();
    if (!row) return null;
    return {
      requestHash: row.request_hash,
      responseStatus: row.response_status,
      responseBody: row.response_body,
    };
  }

  async store(
    key: string,
    userNamespace: string,
    requestHash: string,
    responseStatus: number,
    responseBody: string,
  ): Promise<void> {
    await this.db
      .insertInto("idempotency_keys")
      .values({
        key,
        user_namespace: userNamespace,
        request_hash: requestHash,
        response_status: responseStatus,
        response_body: responseBody,
        created_at: Date.now(),
      })
      .execute();
  }
}
