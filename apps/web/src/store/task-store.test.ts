import { describe, it, expect, beforeEach } from "vitest";
import {
  tasks,
  createTask,
  clearAllTasks,
  toggleTaskCompleted,
  updateTaskText,
  deleteTask,
  getTaskById,
  insertTaskAtIndex,
  setTaskCompletedAt,
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

  describe("updateTaskText", () => {
    it("changes text and preserves id, createdAt, completedAt", () => {
      createTask("original");
      const { id, createdAt, completedAt } = tasks[0]!;
      updateTaskText(id, "updated");
      expect(tasks[0]!.text).toBe("updated");
      expect(tasks[0]!.id).toBe(id);
      expect(tasks[0]!.createdAt).toBe(createdAt);
      expect(tasks[0]!.completedAt).toBe(completedAt);
    });

    it("preserves position (index) in the list", () => {
      createTask("first");
      createTask("second");
      createTask("third");
      const id = tasks[1]!.id;
      updateTaskText(id, "changed");
      expect(tasks[0]!.text).toBe("third");
      expect(tasks[1]!.text).toBe("changed");
      expect(tasks[2]!.text).toBe("first");
    });

    it("updating non-existent id is a no-op", () => {
      createTask("foo");
      updateTaskText("does-not-exist", "bar");
      expect(tasks.length).toBe(1);
      expect(tasks[0]!.text).toBe("foo");
    });
  });

  describe("deleteTask", () => {
    it("removes the task from the store", () => {
      createTask("to delete");
      const id = tasks[0]!.id;
      deleteTask(id);
      expect(tasks.length).toBe(0);
    });

    it("removes only the targeted task", () => {
      createTask("keep");
      createTask("remove");
      const id = tasks[0]!.id;
      deleteTask(id);
      expect(tasks.length).toBe(1);
      expect(tasks[0]!.text).toBe("keep");
    });

    it("deleting non-existent id is a no-op", () => {
      createTask("foo");
      deleteTask("does-not-exist");
      expect(tasks.length).toBe(1);
      expect(tasks[0]!.text).toBe("foo");
    });
  });

  describe("getTaskById", () => {
    it("returns the task when it exists", () => {
      createTask("find me");
      const id = tasks[0]!.id;
      const found = getTaskById(id);
      expect(found).toBeDefined();
      expect(found!.text).toBe("find me");
      expect(found!.id).toBe(id);
    });

    it("returns undefined for non-existent id", () => {
      createTask("foo");
      expect(getTaskById("does-not-exist")).toBeUndefined();
    });
  });

  describe("setTaskCompletedAt", () => {
    it("sets a null completedAt to a timestamp", () => {
      createTask("test");
      const id = tasks[0]!.id;
      expect(tasks[0]!.completedAt).toBeNull();
      setTaskCompletedAt(id, 12345);
      expect(tasks[0]!.completedAt).toBe(12345);
    });

    it("sets a timestamp completedAt back to null", () => {
      createTask("test");
      const id = tasks[0]!.id;
      toggleTaskCompleted(id);
      expect(tasks[0]!.completedAt).toBeTypeOf("number");
      setTaskCompletedAt(id, null);
      expect(tasks[0]!.completedAt).toBeNull();
    });

    it("preserves text, id, createdAt, and position", () => {
      createTask("first");
      createTask("second");
      const { id, text, createdAt } = tasks[1]!;
      setTaskCompletedAt(id, 99999);
      expect(tasks[1]!.id).toBe(id);
      expect(tasks[1]!.text).toBe(text);
      expect(tasks[1]!.createdAt).toBe(createdAt);
      expect(tasks[0]!.text).toBe("second");
      expect(tasks[1]!.text).toBe("first");
    });

    it("non-existent id is a no-op", () => {
      createTask("test");
      setTaskCompletedAt("does-not-exist", 12345);
      expect(tasks.length).toBe(1);
      expect(tasks[0]!.completedAt).toBeNull();
    });
  });

  describe("insertTaskAtIndex", () => {
    it("inserts at index 0 (beginning)", () => {
      createTask("existing");
      const newTask = { id: "ins-1", text: "inserted", createdAt: 1, completedAt: null };
      insertTaskAtIndex(newTask, 0);
      expect(tasks.length).toBe(2);
      expect(tasks[0]!.text).toBe("inserted");
      expect(tasks[1]!.text).toBe("existing");
    });

    it("inserts at the end", () => {
      createTask("existing");
      const newTask = { id: "ins-2", text: "at end", createdAt: 1, completedAt: null };
      insertTaskAtIndex(newTask, 1);
      expect(tasks.length).toBe(2);
      expect(tasks[0]!.text).toBe("existing");
      expect(tasks[1]!.text).toBe("at end");
    });

    it("inserts at a middle index", () => {
      createTask("c");
      createTask("a");
      const newTask = { id: "ins-3", text: "b", createdAt: 1, completedAt: null };
      insertTaskAtIndex(newTask, 1);
      expect(tasks.length).toBe(3);
      expect(tasks[0]!.text).toBe("a");
      expect(tasks[1]!.text).toBe("b");
      expect(tasks[2]!.text).toBe("c");
    });
  });
});
