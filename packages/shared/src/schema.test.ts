import { describe, it, expect } from "vitest";
import {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  Mutation,
  ErrorCode,
  ErrorEnvelope,
  MAX_TASK_TEXT_LENGTH,
} from "./schema.js";

describe("Task", () => {
  it("validates a well-formed task", () => {
    const ok = Task.safeParse({
      id: "01HZX",
      userNamespace: "default",
      text: "buy milk",
      completedAt: null,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    });
    expect(ok.success).toBe(true);
  });

  it("rejects oversized text", () => {
    const r = Task.safeParse({
      id: "x",
      userNamespace: "default",
      text: "a".repeat(MAX_TASK_TEXT_LENGTH + 1),
      completedAt: null,
      createdAt: 1,
      updatedAt: 1,
    });
    expect(r.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const r = Task.safeParse({ id: "x", text: "hi" });
    expect(r.success).toBe(false);
  });
});

describe("CreateTaskInput", () => {
  it("validates", () => {
    const r = CreateTaskInput.safeParse({ id: "x", text: "hi", createdAt: 1 });
    expect(r.success).toBe(true);
  });

  it("rejects oversized text", () => {
    const r = CreateTaskInput.safeParse({
      id: "x",
      text: "a".repeat(MAX_TASK_TEXT_LENGTH + 1),
      createdAt: 1,
    });
    expect(r.success).toBe(false);
  });
});

describe("UpdateTaskInput", () => {
  it("accepts text-only update", () => {
    expect(UpdateTaskInput.safeParse({ text: "new" }).success).toBe(true);
  });

  it("accepts completedAt-only update", () => {
    expect(UpdateTaskInput.safeParse({ completedAt: 1 }).success).toBe(true);
    expect(UpdateTaskInput.safeParse({ completedAt: null }).success).toBe(true);
  });

  it("rejects empty body", () => {
    expect(UpdateTaskInput.safeParse({}).success).toBe(false);
  });
});

describe("Mutation", () => {
  it("validates create", () => {
    const r = Mutation.safeParse({
      type: "create",
      id: "x",
      text: "hi",
      createdAt: 1,
      idempotencyKey: "k",
    });
    expect(r.success).toBe(true);
  });

  it("validates update", () => {
    expect(
      Mutation.safeParse({
        type: "update",
        id: "x",
        text: "y",
        idempotencyKey: "k",
      }).success,
    ).toBe(true);
  });

  it("validates delete", () => {
    expect(Mutation.safeParse({ type: "delete", id: "x", idempotencyKey: "k" }).success).toBe(true);
  });

  it("rejects unknown type", () => {
    expect(Mutation.safeParse({ type: "drop", id: "x", idempotencyKey: "k" }).success).toBe(false);
  });
});

describe("ErrorCode and ErrorEnvelope", () => {
  it("ErrorCode is a strict enum", () => {
    expect(ErrorCode.safeParse("ValidationError").success).toBe(true);
    expect(ErrorCode.safeParse("Whatever").success).toBe(false);
  });

  it("ErrorEnvelope wraps a code and message", () => {
    const r = ErrorEnvelope.safeParse({
      error: { code: "ValidationError", message: "nope" },
    });
    expect(r.success).toBe(true);
  });
});
