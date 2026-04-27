import { describe, it, expect } from "vitest";
import { TaskSchema } from "./schema.js";

describe("TaskSchema", () => {
  it("validates a valid task", () => {
    const result = TaskSchema.safeParse({
      id: "abc-123",
      title: "Test task",
      completed: false,
      createdAt: "2026-01-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a task with missing title", () => {
    const result = TaskSchema.safeParse({
      id: "abc-123",
      completed: false,
      createdAt: "2026-01-01T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});
