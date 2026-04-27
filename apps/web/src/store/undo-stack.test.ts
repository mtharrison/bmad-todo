import { describe, it, expect, beforeEach } from "vitest";
import {
  tasks,
  createTask,
  clearAllTasks,
  toggleTaskCompleted,
  updateTaskText,
  deleteTask,
} from "./task-store";
import {
  undoStack,
  pushUndo,
  popUndo,
  applyUndo,
  clearUndoStack,
} from "./undo-stack";

describe("undo-stack", () => {
  beforeEach(() => {
    clearAllTasks();
    clearUndoStack();
  });

  describe("stack mechanics", () => {
    it("pushUndo appends to the end and reflects new length", () => {
      pushUndo({ inverseMutation: { type: "updateText", id: "a", previousText: "old" } });
      expect(undoStack.length).toBe(1);
      pushUndo({ inverseMutation: { type: "updateText", id: "b", previousText: "old2" } });
      expect(undoStack.length).toBe(2);
    });

    it("popUndo returns the last-pushed entry (LIFO)", () => {
      pushUndo({ inverseMutation: { type: "updateText", id: "a", previousText: "first" } });
      pushUndo({ inverseMutation: { type: "updateText", id: "b", previousText: "second" } });
      const entry = popUndo();
      expect(entry).toBeDefined();
      expect(entry!.inverseMutation.type).toBe("updateText");
      expect((entry!.inverseMutation as { type: "updateText"; id: string; previousText: string }).previousText).toBe("second");
      expect(undoStack.length).toBe(1);
    });

    it("popUndo on empty stack returns undefined and does not throw", () => {
      const entry = popUndo();
      expect(entry).toBeUndefined();
    });

    it("applyUndo on empty stack returns false", () => {
      expect(applyUndo()).toBe(false);
    });

    it("applyUndo on non-empty stack returns true and applies the inverse", () => {
      createTask("original");
      const id = tasks[0]!.id;
      updateTaskText(id, "changed");
      pushUndo({ inverseMutation: { type: "updateText", id, previousText: "original" } });
      expect(applyUndo()).toBe(true);
      expect(tasks[0]!.text).toBe("original");
      expect(undoStack.length).toBe(0);
    });

    it("applyInverseMutation with insert restores a task at the correct index", () => {
      createTask("a");
      createTask("b");
      const taskB = { ...tasks[0]! };
      deleteTask(taskB.id);
      expect(tasks.length).toBe(1);
      pushUndo({ inverseMutation: { type: "insert", task: taskB, index: 0 } });
      applyUndo();
      expect(tasks.length).toBe(2);
      expect(tasks[0]!.text).toBe("b");
    });

    it("applyInverseMutation with updateText changes text back", () => {
      createTask("original");
      const id = tasks[0]!.id;
      updateTaskText(id, "changed");
      pushUndo({ inverseMutation: { type: "updateText", id, previousText: "original" } });
      applyUndo();
      expect(tasks[0]!.text).toBe("original");
    });

    it("applyInverseMutation with setCompletedAt restores exact value", () => {
      createTask("task");
      const id = tasks[0]!.id;
      toggleTaskCompleted(id);
      pushUndo({ inverseMutation: { type: "setCompletedAt", id, previousCompletedAt: null } });
      applyUndo();
      expect(tasks[0]!.completedAt).toBeNull();

      clearUndoStack();
      toggleTaskCompleted(id);
      const ts = tasks[0]!.completedAt!;
      toggleTaskCompleted(id);
      pushUndo({ inverseMutation: { type: "setCompletedAt", id, previousCompletedAt: ts } });
      applyUndo();
      expect(tasks[0]!.completedAt).toBe(ts);
    });

    it("clearUndoStack empties the stack", () => {
      pushUndo({ inverseMutation: { type: "updateText", id: "a", previousText: "x" } });
      pushUndo({ inverseMutation: { type: "updateText", id: "b", previousText: "y" } });
      expect(undoStack.length).toBe(2);
      clearUndoStack();
      expect(undoStack.length).toBe(0);
    });
  });

  describe("reversibility", () => {
    it("complete (null → timestamp) → undo restores null completedAt and preserves text/position", () => {
      createTask("walk dog");
      const id = tasks[0]!.id;
      const textBefore = tasks[0]!.text;
      expect(tasks[0]!.completedAt).toBeNull();

      const previousCompletedAt = tasks[0]!.completedAt;
      toggleTaskCompleted(id);
      pushUndo({ inverseMutation: { type: "setCompletedAt", id, previousCompletedAt } });

      expect(tasks[0]!.completedAt).toBeTypeOf("number");
      applyUndo();

      expect(tasks[0]!.completedAt).toBeNull();
      expect(tasks[0]!.text).toBe(textBefore);
      expect(tasks.length).toBe(1);
    });

    it("uncomplete (timestamp → null) → undo restores exact original timestamp", () => {
      createTask("walk dog");
      const id = tasks[0]!.id;
      toggleTaskCompleted(id);
      const originalTs = tasks[0]!.completedAt!;

      const previousCompletedAt = tasks[0]!.completedAt;
      toggleTaskCompleted(id);
      pushUndo({ inverseMutation: { type: "setCompletedAt", id, previousCompletedAt } });

      expect(tasks[0]!.completedAt).toBeNull();
      applyUndo();

      expect(tasks[0]!.completedAt).toBe(originalTs);
    });

    it("edit-text → undo restores original text, position and completion unchanged", () => {
      createTask("original");
      const id = tasks[0]!.id;
      const previousText = tasks[0]!.text;
      updateTaskText(id, "edited");
      pushUndo({ inverseMutation: { type: "updateText", id, previousText } });

      expect(tasks[0]!.text).toBe("edited");
      applyUndo();

      expect(tasks[0]!.text).toBe("original");
      expect(tasks[0]!.completedAt).toBeNull();
      expect(tasks.length).toBe(1);
    });

    it("delete → undo restores task at original position with exact state", () => {
      createTask("c");
      createTask("b");
      createTask("a");
      const targetId = tasks[1]!.id;
      const snapshot = { ...tasks[1]! };
      const index = 1;

      deleteTask(targetId);
      pushUndo({ inverseMutation: { type: "insert", task: snapshot, index } });

      expect(tasks.length).toBe(2);
      applyUndo();

      expect(tasks.length).toBe(3);
      expect(tasks[1]!.text).toBe(snapshot.text);
      expect(tasks[1]!.id).toBe(snapshot.id);
      expect(tasks[1]!.createdAt).toBe(snapshot.createdAt);
      expect(tasks[1]!.completedAt).toBe(snapshot.completedAt);
      expect(tasks[0]!.text).toBe("a");
      expect(tasks[2]!.text).toBe("c");
    });
  });

  describe("multi-step LIFO", () => {
    it("edit → complete → delete → 3 undos reverses in order", () => {
      createTask("original");
      const id = tasks[0]!.id;

      updateTaskText(id, "edited");
      pushUndo({ inverseMutation: { type: "updateText", id, previousText: "original" } });

      const prevCompleted = tasks[0]!.completedAt;
      toggleTaskCompleted(id);
      pushUndo({ inverseMutation: { type: "setCompletedAt", id, previousCompletedAt: prevCompleted } });

      const snapshot = { ...tasks[0]! };
      deleteTask(id);
      pushUndo({ inverseMutation: { type: "insert", task: snapshot, index: 0 } });

      expect(undoStack.length).toBe(3);

      applyUndo();
      expect(tasks.length).toBe(1);
      expect(tasks[0]!.text).toBe("edited");
      expect(tasks[0]!.completedAt).toBeTypeOf("number");

      applyUndo();
      expect(tasks[0]!.completedAt).toBeNull();

      applyUndo();
      expect(tasks[0]!.text).toBe("original");

      expect(undoStack.length).toBe(0);
      expect(applyUndo()).toBe(false);
    });
  });

  describe("empty-stack no-op", () => {
    it("applyUndo on empty stack returns false and does not change tasks", () => {
      createTask("stay");
      expect(applyUndo()).toBe(false);
      expect(tasks.length).toBe(1);
      expect(tasks[0]!.text).toBe("stay");
    });
  });
});
