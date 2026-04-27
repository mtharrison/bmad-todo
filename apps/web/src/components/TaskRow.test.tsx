import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@solidjs/testing-library";
import { TaskRow } from "./TaskRow";
import { tasks, createTask, clearAllTasks, toggleTaskCompleted } from "../store/task-store";
import { undoStack, clearUndoStack } from "../store/undo-stack";

describe("TaskRow", () => {
  beforeEach(() => {
    clearAllTasks();
    clearUndoStack();
  });

  afterEach(() => {
    cleanup();
  });

  it("active task renders data-completed=false, one checkbox, zero svg", () => {
    const task = { id: "t1", text: "hello", createdAt: 0, completedAt: null };
    const { container } = render(() => <TaskRow task={task} />);
    const li = container.querySelector("li")!;
    const input = container.querySelector("input[type=checkbox]")!;

    expect(li.dataset.completed).toBe("false");
    expect(container.querySelectorAll("input[type=checkbox]").length).toBe(1);
    expect(input.getAttribute("aria-checked")).toBe("false");
    expect(container.querySelectorAll("svg").length).toBe(0);
  });

  it("completed task renders data-completed=true, checkbox with aria-checked, one svg", () => {
    const task = { id: "t1", text: "hello", createdAt: 0, completedAt: 1000 };
    const { container } = render(() => <TaskRow task={task} />);
    const li = container.querySelector("li")!;
    const input = container.querySelector("input[type=checkbox]")!;

    expect(li.dataset.completed).toBe("true");
    expect(input.getAttribute("aria-checked")).toBe("true");
    expect(container.querySelectorAll("svg").length).toBe(1);
  });

  it("checkbox has aria-label 'Mark complete'", () => {
    const task = { id: "t1", text: "hello", createdAt: 0, completedAt: null };
    const { container } = render(() => <TaskRow task={task} />);
    const input = container.querySelector("input[type=checkbox]")!;

    expect(input.getAttribute("aria-label")).toBe("Mark complete");
  });

  it("clicking li outside .task-text toggles completion via store", () => {
    createTask("walk dog");
    const task = tasks[0]!;
    const { container } = render(() => <TaskRow task={task} />);
    const li = container.querySelector("li")!;

    fireEvent.click(li);
    expect(tasks[0]!.completedAt).toBeTypeOf("number");
  });

  it("clicking inside .task-text does NOT toggle completion", () => {
    createTask("walk dog");
    const task = tasks[0]!;
    const { container } = render(() => <TaskRow task={task} />);
    const span = container.querySelector(".task-text")!;

    fireEvent.click(span);
    expect(tasks[0]!.completedAt).toBeNull();
  });

  it("pressing x while li is focused toggles state", () => {
    createTask("walk dog");
    const task = tasks[0]!;
    const { container } = render(() => <TaskRow task={task} />);
    const li = container.querySelector("li")!;

    fireEvent.keyDown(li, { key: "x" });
    expect(tasks[0]!.completedAt).toBeTypeOf("number");
  });

  it("pressing X (capital) also toggles state", () => {
    createTask("walk dog");
    const task = tasks[0]!;
    const { container } = render(() => <TaskRow task={task} />);
    const li = container.querySelector("li")!;

    fireEvent.keyDown(li, { key: "X" });
    expect(tasks[0]!.completedAt).toBeTypeOf("number");
  });

  it("pressing y is a no-op", () => {
    createTask("walk dog");
    const task = tasks[0]!;
    const { container } = render(() => <TaskRow task={task} />);
    const li = container.querySelector("li")!;

    fireEvent.keyDown(li, { key: "y" });
    expect(tasks[0]!.completedAt).toBeNull();
  });

  it("Cmd/Ctrl/Alt + x is a no-op (does not toggle)", () => {
    createTask("walk dog");
    const task = tasks[0]!;
    const { container } = render(() => <TaskRow task={task} />);
    const li = container.querySelector("li")!;

    fireEvent.keyDown(li, { key: "x", metaKey: true });
    expect(tasks[0]!.completedAt).toBeNull();
    fireEvent.keyDown(li, { key: "x", ctrlKey: true });
    expect(tasks[0]!.completedAt).toBeNull();
    fireEvent.keyDown(li, { key: "x", altKey: true });
    expect(tasks[0]!.completedAt).toBeNull();
  });

  it("keydown on descendant input does not trigger row handler", () => {
    createTask("walk dog");
    const task = tasks[0]!;
    const { container } = render(() => <TaskRow task={task} />);
    const input = container.querySelector("input[type=checkbox]")!;

    fireEvent.keyDown(input, { key: "x" });
    expect(tasks[0]!.completedAt).toBeNull();
  });

  describe("edit mode", () => {
    it("clicking .task-text sets contenteditable on the text span", () => {
      createTask("editable");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} />);
      const span = container.querySelector(".task-text")!;

      fireEvent.click(span);
      expect(span.getAttribute("contenteditable")).toBe("plaintext-only");
    });

    it("pressing E on focused li activates edit mode", () => {
      createTask("editable");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} />);
      const li = container.querySelector("li")!;
      const span = container.querySelector(".task-text")!;

      fireEvent.keyDown(li, { key: "e" });
      expect(span.getAttribute("contenteditable")).toBe("plaintext-only");
    });

    it("pressing Enter in edit mode commits the text change", () => {
      createTask("original text");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} />);
      const span = container.querySelector(".task-text")!;

      fireEvent.click(span);
      span.textContent = "updated text";
      fireEvent.keyDown(span, { key: "Enter" });

      expect(tasks[0]!.text).toBe("updated text");
      expect(span.getAttribute("contenteditable")).toBeNull();
    });

    it("pressing Escape in edit mode restores original text and leaves edit mode", () => {
      createTask("keep this");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} />);
      const span = container.querySelector(".task-text")!;

      fireEvent.click(span);
      span.textContent = "changed";
      fireEvent.keyDown(span, { key: "Escape" });

      expect(span.textContent).toBe("keep this");
      expect(tasks[0]!.text).toBe("keep this");
      expect(span.getAttribute("contenteditable")).toBeNull();
    });

    it("committing whitespace-only text calls deleteTask", () => {
      createTask("to be deleted");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} />);
      const span = container.querySelector(".task-text")!;

      fireEvent.click(span);
      span.textContent = "   ";
      fireEvent.keyDown(span, { key: "Enter" });

      expect(tasks.length).toBe(0);
    });

    it("focusout in edit mode commits the text change", () => {
      createTask("original text");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} />);
      const span = container.querySelector(".task-text")!;

      fireEvent.click(span);
      span.textContent = "blur updated";
      fireEvent.focusOut(span);

      expect(tasks[0]!.text).toBe("blur updated");
      expect(span.getAttribute("contenteditable")).toBeNull();
    });

    it("committing same text as original does not call updateTaskText", () => {
      createTask("unchanged");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} />);
      const span = container.querySelector(".task-text")!;

      fireEvent.click(span);
      fireEvent.keyDown(span, { key: "Enter" });

      expect(tasks[0]!.text).toBe("unchanged");
    });

    it("x/X does NOT toggle completion while in edit mode", () => {
      createTask("editing");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} />);
      const li = container.querySelector("li")!;

      fireEvent.keyDown(li, { key: "e" });
      fireEvent.keyDown(li, { key: "x" });
      expect(tasks[0]!.completedAt).toBeNull();
      fireEvent.keyDown(li, { key: "X" });
      expect(tasks[0]!.completedAt).toBeNull();
    });

    it("d/D does NOT delete while in edit mode", () => {
      createTask("editing");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} />);
      const li = container.querySelector("li")!;

      fireEvent.keyDown(li, { key: "e" });
      fireEvent.keyDown(li, { key: "d" });
      expect(tasks.length).toBe(1);
      fireEvent.keyDown(li, { key: "D" });
      expect(tasks.length).toBe(1);
    });
  });

  describe("delete by keystroke", () => {
    it("pressing D on focused li removes the task", () => {
      createTask("to delete");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} />);
      const li = container.querySelector("li")!;

      fireEvent.keyDown(li, { key: "D" });
      expect(tasks.length).toBe(0);
    });

    it("pressing d (lowercase) also deletes", () => {
      createTask("to delete");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} />);
      const li = container.querySelector("li")!;

      fireEvent.keyDown(li, { key: "d" });
      expect(tasks.length).toBe(0);
    });
  });

  describe("undo entry push", () => {
    it("pressing X on active task pushes setCompletedAt with previousCompletedAt: null", () => {
      createTask("task");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} />);
      const li = container.querySelector("li")!;

      fireEvent.keyDown(li, { key: "X" });
      expect(undoStack.length).toBe(1);
      expect(undoStack[0]!.inverseMutation.type).toBe("setCompletedAt");
      const im = undoStack[0]!.inverseMutation as { type: "setCompletedAt"; id: string; previousCompletedAt: number | null };
      expect(im.previousCompletedAt).toBeNull();
    });

    it("pressing X on completed task pushes setCompletedAt with original timestamp", () => {
      createTask("task");
      const task = tasks[0]!;
      toggleTaskCompleted(task.id);
      const ts = tasks[0]!.completedAt!;
      clearUndoStack();

      const { container } = render(() => <TaskRow task={task} />);
      const li = container.querySelector("li")!;

      fireEvent.keyDown(li, { key: "X" });
      expect(undoStack.length).toBe(1);
      const im = undoStack[0]!.inverseMutation as { type: "setCompletedAt"; id: string; previousCompletedAt: number | null };
      expect(im.previousCompletedAt).toBe(ts);
    });

    it("clicking row outside .task-text pushes setCompletedAt undo entry", () => {
      createTask("task");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} />);
      const li = container.querySelector("li")!;

      fireEvent.click(li);
      expect(undoStack.length).toBe(1);
      expect(undoStack[0]!.inverseMutation.type).toBe("setCompletedAt");
    });

    it("checkbox onChange pushes exactly one undo entry (no double-fire)", () => {
      createTask("task");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} />);
      const input = container.querySelector("input[type=checkbox]")!;

      fireEvent.change(input);
      expect(undoStack.length).toBe(1);
      expect(undoStack[0]!.inverseMutation.type).toBe("setCompletedAt");
    });

    it("pressing D pushes insert undo entry with snapshot clone", () => {
      createTask("to delete");
      const task = tasks[0]!;
      const originalText = tasks[0]!.text;
      const { container } = render(() => <TaskRow task={task} />);
      const li = container.querySelector("li")!;

      fireEvent.keyDown(li, { key: "D" });
      expect(undoStack.length).toBe(1);
      expect(undoStack[0]!.inverseMutation.type).toBe("insert");
      const im = undoStack[0]!.inverseMutation as { type: "insert"; task: { text: string }; index: number };
      expect(im.task.text).toBe(originalText);
      expect(im.index).toBe(0);
    });

    it("editing text via Enter pushes updateText undo entry", () => {
      createTask("original text");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} />);
      const span = container.querySelector(".task-text")!;

      fireEvent.click(span);
      span.textContent = "updated text";
      fireEvent.keyDown(span, { key: "Enter" });

      expect(undoStack.length).toBe(1);
      expect(undoStack[0]!.inverseMutation.type).toBe("updateText");
      const im = undoStack[0]!.inverseMutation as { type: "updateText"; id: string; previousText: string };
      expect(im.previousText).toBe("original text");
    });

    it("editing to whitespace-only pushes insert undo with original text", () => {
      createTask("draft text");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} />);
      const span = container.querySelector(".task-text")!;

      fireEvent.click(span);
      span.textContent = "   ";
      fireEvent.keyDown(span, { key: "Enter" });

      expect(tasks.length).toBe(0);
      expect(undoStack.length).toBe(1);
      expect(undoStack[0]!.inverseMutation.type).toBe("insert");
      const im = undoStack[0]!.inverseMutation as { type: "insert"; task: { text: string }; index: number };
      expect(im.task.text).toBe("draft text");
    });

    it("pressing Escape during edit pushes NO undo entry", () => {
      createTask("keep this");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} />);
      const span = container.querySelector(".task-text")!;

      fireEvent.click(span);
      span.textContent = "changed";
      fireEvent.keyDown(span, { key: "Escape" });

      expect(undoStack.length).toBe(0);
    });

    it("committing unchanged text pushes NO undo entry", () => {
      createTask("unchanged");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} />);
      const span = container.querySelector(".task-text")!;

      fireEvent.click(span);
      fireEvent.keyDown(span, { key: "Enter" });

      expect(undoStack.length).toBe(0);
    });
  });
});
