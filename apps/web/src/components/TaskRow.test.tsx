import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@solidjs/testing-library";
import { TaskRow } from "./TaskRow";
import { tasks, createTask, clearAllTasks } from "../store/task-store";
import { undoStack, clearUndoStack } from "../store/undo-stack";
import {
  focusedRowIndex,
  setRowFocus,
  setEditingTask,
  clearAllFocus,
  editingTaskId,
} from "../store/focus-store";

describe("TaskRow", () => {
  beforeEach(() => {
    clearAllTasks();
    clearUndoStack();
    clearAllFocus();
  });

  afterEach(() => {
    cleanup();
  });

  it("active task renders data-completed=false, one checkbox, zero svg", () => {
    const task = {
      id: "t1",
      userNamespace: "default",
      text: "hello",
      createdAt: 0,
      updatedAt: 0,
      completedAt: null,
    };
    const { container } = render(() => <TaskRow task={task} index={0} />);
    const li = container.querySelector("li")!;
    const input = container.querySelector("input[type=checkbox]")!;

    expect(li.dataset.completed).toBe("false");
    expect(container.querySelectorAll("input[type=checkbox]").length).toBe(1);
    expect(input.getAttribute("aria-checked")).toBe("false");
    expect(container.querySelectorAll("svg").length).toBe(0);
  });

  it("completed task renders data-completed=true, checkbox with aria-checked, one svg", () => {
    const task = {
      id: "t1",
      userNamespace: "default",
      text: "hello",
      createdAt: 0,
      updatedAt: 0,
      completedAt: 1000,
    };
    const { container } = render(() => <TaskRow task={task} index={0} />);
    const li = container.querySelector("li")!;
    const input = container.querySelector("input[type=checkbox]")!;

    expect(li.dataset.completed).toBe("true");
    expect(input.getAttribute("aria-checked")).toBe("true");
    expect(container.querySelectorAll("svg").length).toBe(1);
  });

  it("checkbox has aria-label 'Mark complete'", () => {
    const task = {
      id: "t1",
      userNamespace: "default",
      text: "hello",
      createdAt: 0,
      updatedAt: 0,
      completedAt: null,
    };
    const { container } = render(() => <TaskRow task={task} index={0} />);
    const input = container.querySelector("input[type=checkbox]")!;

    expect(input.getAttribute("aria-label")).toBe("Mark complete");
  });

  it("clicking li outside .task-text toggles completion via store", () => {
    createTask("walk dog");
    const task = tasks[0]!;
    const { container } = render(() => <TaskRow task={task} index={0} />);
    const li = container.querySelector("li")!;

    fireEvent.click(li);
    expect(tasks[0]!.completedAt).toBeTypeOf("number");
  });

  it("clicking inside .task-text does NOT toggle completion", () => {
    createTask("walk dog");
    const task = tasks[0]!;
    const { container } = render(() => <TaskRow task={task} index={0} />);
    const span = container.querySelector(".task-text")!;

    fireEvent.click(span);
    expect(tasks[0]!.completedAt).toBeNull();
  });

  describe("roving tabindex", () => {
    it("row at the focused index has tabindex=0 and data-focused=true", () => {
      createTask("a");
      const task = tasks[0]!;
      setRowFocus(0);
      const { container } = render(() => <TaskRow task={task} index={0} />);
      const li = container.querySelector("li")!;

      expect(li.tabIndex).toBe(0);
      expect(li.dataset.focused).toBe("true");
    });

    it("row at a non-focused index has tabindex=-1 and data-focused=false", () => {
      createTask("a");
      const task = tasks[0]!;
      setRowFocus(0);
      const { container } = render(() => <TaskRow task={task} index={1} />);
      const li = container.querySelector("li")!;

      expect(li.tabIndex).toBe(-1);
      expect(li.dataset.focused).toBe("false");
    });

    it("when focusedRowIndex is null, row 0 has tabindex=0 (default-tab target) but data-focused=false", () => {
      createTask("a");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} index={0} />);
      const li = container.querySelector("li")!;

      expect(focusedRowIndex()).toBeNull();
      expect(li.tabIndex).toBe(0);
      expect(li.dataset.focused).toBe("false");
    });

    it("when focusedRowIndex is null, non-zero rows have tabindex=-1", () => {
      createTask("a");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} index={2} />);
      const li = container.querySelector("li")!;

      expect(li.tabIndex).toBe(-1);
    });

    it("changing setRowFocus reactively shifts tabindex/data-focused", () => {
      createTask("a");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} index={1} />);
      const li = container.querySelector("li")!;

      expect(li.tabIndex).toBe(-1);
      setRowFocus(1);
      expect(li.tabIndex).toBe(0);
      expect(li.dataset.focused).toBe("true");
      setRowFocus(2);
      expect(li.tabIndex).toBe(-1);
      expect(li.dataset.focused).toBe("false");
    });

    it("DOM focus event syncs the focus-store to the row index", () => {
      createTask("a");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} index={1} />);
      const li = container.querySelector("li")!;

      fireEvent.focus(li);
      expect(focusedRowIndex()).toBe(1);
    });
  });

  describe("edit mode (store-driven)", () => {
    it("clicking .task-text sets contenteditable on the text span", () => {
      createTask("editable");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} index={0} />);
      const span = container.querySelector(".task-text")!;

      fireEvent.click(span);
      expect(span.getAttribute("contenteditable")).toBe("plaintext-only");
      expect(editingTaskId()).toBe(task.id);
    });

    it("setEditingTask(task.id) externally sets contenteditable on the row", () => {
      createTask("editable");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} index={0} />);
      const span = container.querySelector(".task-text")!;

      setEditingTask(task.id);
      expect(span.getAttribute("contenteditable")).toBe("plaintext-only");
    });

    it("setEditingTask(null) removes contenteditable", () => {
      createTask("editable");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} index={0} />);
      const span = container.querySelector(".task-text")!;

      setEditingTask(task.id);
      expect(span.getAttribute("contenteditable")).toBe("plaintext-only");
      setEditingTask(null);
      expect(span.getAttribute("contenteditable")).toBeNull();
    });

    it("setEditingTask(null) returns DOM focus to the li when row is focused (AC#10)", () => {
      createTask("editable");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} index={0} />);
      const li = container.querySelector("li")!;

      setRowFocus(0);
      setEditingTask(task.id);
      setEditingTask(null);

      expect(document.activeElement).toBe(li);
    });

    it("pressing Enter in edit mode commits the text change", () => {
      createTask("original text");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} index={0} />);
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
      const { container } = render(() => <TaskRow task={task} index={0} />);
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
      const { container } = render(() => <TaskRow task={task} index={0} />);
      const span = container.querySelector(".task-text")!;

      fireEvent.click(span);
      span.textContent = "   ";
      fireEvent.keyDown(span, { key: "Enter" });

      expect(tasks.length).toBe(0);
    });

    it("focusout in edit mode commits the text change", () => {
      createTask("original text");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} index={0} />);
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
      const { container } = render(() => <TaskRow task={task} index={0} />);
      const span = container.querySelector(".task-text")!;

      fireEvent.click(span);
      fireEvent.keyDown(span, { key: "Enter" });

      expect(tasks[0]!.text).toBe("unchanged");
    });

    it("enterEditMode is a no-op while another task is already editing", () => {
      createTask("first");
      createTask("second");
      // tasks are newest-first: tasks[0] = "second", tasks[1] = "first"
      const taskA = tasks[0]!;
      const taskB = tasks[1]!;

      setEditingTask(taskA.id);
      const { container } = render(() => <TaskRow task={taskB} index={1} />);
      const span = container.querySelector(".task-text")!;

      fireEvent.click(span);
      // taskB should NOT have entered edit (taskA already editing)
      expect(editingTaskId()).toBe(taskA.id);
    });
  });

  describe("undo entry push (click + checkbox + edit pathways)", () => {
    it("clicking row outside .task-text pushes setCompletedAt undo entry", () => {
      createTask("task");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} index={0} />);
      const li = container.querySelector("li")!;

      fireEvent.click(li);
      expect(undoStack.length).toBe(1);
      expect(undoStack[0]!.inverseMutation.type).toBe("setCompletedAt");
    });

    it("checkbox onChange pushes exactly one undo entry (no double-fire)", () => {
      createTask("task");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} index={0} />);
      const input = container.querySelector("input[type=checkbox]")!;

      fireEvent.change(input);
      expect(undoStack.length).toBe(1);
      expect(undoStack[0]!.inverseMutation.type).toBe("setCompletedAt");
    });

    it("editing text via Enter pushes updateText undo entry", () => {
      createTask("original text");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} index={0} />);
      const span = container.querySelector(".task-text")!;

      fireEvent.click(span);
      span.textContent = "updated text";
      fireEvent.keyDown(span, { key: "Enter" });

      expect(undoStack.length).toBe(1);
      expect(undoStack[0]!.inverseMutation.type).toBe("updateText");
      const im = undoStack[0]!.inverseMutation as {
        type: "updateText";
        id: string;
        previousText: string;
      };
      expect(im.previousText).toBe("original text");
    });

    it("editing to whitespace-only pushes insert undo with original text", () => {
      createTask("draft text");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} index={0} />);
      const span = container.querySelector(".task-text")!;

      fireEvent.click(span);
      span.textContent = "   ";
      fireEvent.keyDown(span, { key: "Enter" });

      expect(tasks.length).toBe(0);
      expect(undoStack.length).toBe(1);
      expect(undoStack[0]!.inverseMutation.type).toBe("insert");
      const im = undoStack[0]!.inverseMutation as {
        type: "insert";
        task: { text: string };
        index: number;
      };
      expect(im.task.text).toBe("draft text");
    });

    it("pressing Escape during edit pushes NO undo entry", () => {
      createTask("keep this");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} index={0} />);
      const span = container.querySelector(".task-text")!;

      fireEvent.click(span);
      span.textContent = "changed";
      fireEvent.keyDown(span, { key: "Escape" });

      expect(undoStack.length).toBe(0);
    });

    it("committing unchanged text pushes NO undo entry", () => {
      createTask("unchanged");
      const task = tasks[0]!;
      const { container } = render(() => <TaskRow task={task} index={0} />);
      const span = container.querySelector(".task-text")!;

      fireEvent.click(span);
      fireEvent.keyDown(span, { key: "Enter" });

      expect(undoStack.length).toBe(0);
    });
  });
});
