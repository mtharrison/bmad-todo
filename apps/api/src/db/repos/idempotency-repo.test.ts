import { describe, it, expect, beforeEach } from "vitest";
import { createDb, type DbHandles } from "../kysely.js";
import { runMigrations } from "../migrate.js";
import { IdempotencyRepo } from "./idempotency-repo.js";

describe("IdempotencyRepo", () => {
  let h: DbHandles;
  let repo: IdempotencyRepo;

  beforeEach(() => {
    h = createDb(":memory:");
    runMigrations(h.sqlite);
    repo = new IdempotencyRepo(h.kysely);
  });

  it("find returns null on miss", async () => {
    expect(await repo.find("k", "default")).toBeNull();
  });

  it("store + find round-trip", async () => {
    await repo.store("k", "default", "h", 201, '{"id":"a"}');
    const r = await repo.find("k", "default");
    expect(r).toEqual({
      requestHash: "h",
      responseStatus: 201,
      responseBody: '{"id":"a"}',
    });
  });

  it("namespaces are isolated", async () => {
    await repo.store("k", "alice", "h", 201, "{}");
    expect(await repo.find("k", "bob")).toBeNull();
  });
});
