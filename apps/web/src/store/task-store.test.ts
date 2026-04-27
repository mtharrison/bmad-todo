import { describe, it, expect, beforeEach } from "vitest";
import {
  tasks,
  createTask,
  clearAllTasks,
  toggleTaskCompleted,
} from "./task-store";

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

  it("trims whitespace from stored text", () => {
    createTask("  Buy milk  ");
    expect(tasks.length).toBe(1);
    expect(tasks[0]!.text).toBe("Buy milk");
  });

  it("produces distinct IDs for rapid consecutive calls", () => {
    createTask("a");
    createTask("b");
    expect(tasks[0]!.id).not.toBe(tasks[1]!.id);
  });

  it("new task has completedAt: null", () => {
    createTask("walk dog");
    expect(tasks[0]!.completedAt).toBeNull();
  });

  it("toggleTaskCompleted flips null to a number", () => {
    createTask("walk dog");
    const id = tasks[0]!.id;
    toggleTaskCompleted(id);
    expect(tasks[0]!.completedAt).toBeTypeOf("number");
  });

  it("toggleTaskCompleted flips back to null on second call", () => {
    createTask("walk dog");
    const id = tasks[0]!.id;
    toggleTaskCompleted(id);
    toggleTaskCompleted(id);
    expect(tasks[0]!.completedAt).toBeNull();
  });

  it("toggleTaskCompleted preserves text, id, and createdAt", () => {
    createTask("walk dog");
    const { id, text, createdAt } = tasks[0]!;
    toggleTaskCompleted(id);
    expect(tasks[0]!.id).toBe(id);
    expect(tasks[0]!.text).toBe(text);
    expect(tasks[0]!.createdAt).toBe(createdAt);
  });

  it("toggleTaskCompleted preserves position (index)", () => {
    createTask("first");
    createTask("second");
    const id = tasks[1]!.id;
    toggleTaskCompleted(id);
    expect(tasks[0]!.text).toBe("second");
    expect(tasks[1]!.text).toBe("first");
    expect(tasks[1]!.completedAt).toBeTypeOf("number");
  });

  it("toggling a non-existent id leaves the array unchanged", () => {
    createTask("walk dog");
    const before = tasks[0]!.completedAt;
    toggleTaskCompleted("does-not-exist");
    expect(tasks.length).toBe(1);
    expect(tasks[0]!.completedAt).toBe(before);
  });

  it("toggling one task does not affect other tasks' completedAt", () => {
    createTask("a");
    createTask("b");
    toggleTaskCompleted(tasks[0]!.id);
    expect(tasks[0]!.completedAt).toBeTypeOf("number");
    expect(tasks[1]!.completedAt).toBeNull();
  });
});
