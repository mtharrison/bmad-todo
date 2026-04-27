import { describe, it, expect, beforeEach } from "vitest";
import { tasks, createTask, clearAllTasks } from "./task-store";

describe("task-store", () => {
  beforeEach(() => {
    clearAllTasks();
  });

  it("starts with an empty array", () => {
    expect(tasks.length).toBe(0);
  });

  it("createTask adds a task at index 0", () => {
    createTask("foo");
    expect(tasks.length).toBe(1);
    expect(tasks[0]!.text).toBe("foo");
  });

  it("prepends newest task (newest-first order)", () => {
    createTask("foo");
    createTask("bar");
    expect(tasks.length).toBe(2);
    expect(tasks[0]!.text).toBe("bar");
    expect(tasks[1]!.text).toBe("foo");
  });

  it("drops empty string input", () => {
    createTask("");
    expect(tasks.length).toBe(0);
  });

  it("drops whitespace-only input", () => {
    createTask("   ");
    expect(tasks.length).toBe(0);
  });

  it("drops tab/newline-only input", () => {
    createTask("\n\t");
    expect(tasks.length).toBe(0);
  });

  it("produces distinct IDs for rapid consecutive calls", () => {
    createTask("a");
    createTask("b");
    expect(tasks[0]!.id).not.toBe(tasks[1]!.id);
  });
});
