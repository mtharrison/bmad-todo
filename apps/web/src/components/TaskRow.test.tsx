import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@solidjs/testing-library";
import { TaskRow } from "./TaskRow";
import { tasks, createTask, clearAllTasks } from "../store/task-store";

describe("TaskRow", () => {
  beforeEach(() => {
    clearAllTasks();
  });

  afterEach(() => {
    cleanup();
  });

  it("active task renders data-completed=false, one checkbox, zero svg", () => {
    const task = { id: "t1", text: "hello", createdAt: 0, completedAt: null };
    const { container } = render(() => <TaskRow task={task} />);
    const li = container.querySelector("li")!;

    expect(li.dataset.completed).toBe("false");
    expect(container.querySelectorAll("input[type=checkbox]").length).toBe(1);
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

  it("keydown on descendant input does not trigger row handler", () => {
    createTask("walk dog");
    const task = tasks[0]!;
    const { container } = render(() => <TaskRow task={task} />);
    const input = container.querySelector("input[type=checkbox]")!;

    fireEvent.keyDown(input, { key: "x" });
    expect(tasks[0]!.completedAt).toBeNull();
  });
});
