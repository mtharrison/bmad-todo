import { describe, it, expect, beforeEach } from "vitest";
import { createDb, type DbHandles } from "../kysely.js";
import { runMigrations } from "../migrate.js";
import { TasksRepo } from "./tasks-repo.js";

describe("TasksRepo", () => {
  let h: DbHandles;
  let repo: TasksRepo;

  beforeEach(() => {
    h = createDb(":memory:");
    runMigrations(h.sqlite);
    repo = new TasksRepo(h.kysely);
  });

  it("create + listActive round-trip", async () => {
    const t = await repo.create({
      id: "a",
      userNamespace: "default",
      text: "hello",
      createdAt: 1,
    });
    expect(t.text).toBe("hello");
    expect(t.userNamespace).toBe("default");
    const list = await repo.listActive("default");
    expect(list.length).toBe(1);
    expect(list[0]?.id).toBe("a");
  });

  it("listActive excludes soft-deleted", async () => {
    await repo.create({
      id: "a",
      userNamespace: "default",
      text: "x",
      createdAt: 1,
    });
    await repo.softDelete("a", "default");
    const list = await repo.listActive("default");
    expect(list.length).toBe(0);
  });

  it("namespace isolation", async () => {
    await repo.create({
      id: "a",
      userNamespace: "alice",
      text: "secret",
      createdAt: 1,
    });
    await repo.create({
      id: "b",
      userNamespace: "bob",
      text: "other",
      createdAt: 2,
    });
    expect((await repo.listActive("alice")).length).toBe(1);
    expect((await repo.listActive("bob")).length).toBe(1);
    expect((await repo.listActive("default")).length).toBe(0);
  });

  it("update returns null for missing id", async () => {
    const r = await repo.update("nope", "default", { text: "x" });
    expect(r).toBeNull();
  });

  it("update applies text and completedAt", async () => {
    await repo.create({
      id: "a",
      userNamespace: "default",
      text: "old",
      createdAt: 1,
    });
    const r = await repo.update("a", "default", {
      text: "new",
      completedAt: 99,
    });
    expect(r?.text).toBe("new");
    expect(r?.completedAt).toBe(99);
  });

  it("softDelete idempotent — second call returns false", async () => {
    await repo.create({
      id: "a",
      userNamespace: "default",
      text: "x",
      createdAt: 1,
    });
    expect(await repo.softDelete("a", "default")).toBe(true);
    expect(await repo.softDelete("a", "default")).toBe(false);
  });

  it("listActive ordered by id desc (UUIDv7 lexicographic)", async () => {
    await repo.create({
      id: "01HZ0",
      userNamespace: "default",
      text: "a",
      createdAt: 1,
    });
    await repo.create({
      id: "01HZ1",
      userNamespace: "default",
      text: "b",
      createdAt: 2,
    });
    await repo.create({
      id: "01HZ2",
      userNamespace: "default",
      text: "c",
      createdAt: 3,
    });
    const ids = (await repo.listActive("default")).map((t) => t.id);
    expect(ids).toEqual(["01HZ2", "01HZ1", "01HZ0"]);
  });
});
