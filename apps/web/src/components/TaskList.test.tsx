import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { TaskList } from "./TaskList";
import { clearAllTasks, createTask } from "../store/task-store";
import { setRowFocus, clearAllFocus } from "../store/focus-store";

describe("TaskList", () => {
  beforeEach(() => {
    clearAllTasks();
    clearAllFocus();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders an empty ul with role=list when store is empty", () => {
    const { container } = render(() => <TaskList />);
    const ul = container.querySelector("ul");

    expect(ul).not.toBeNull();
    expect(ul!.getAttribute("role")).toBe("list");
    expect(ul!.querySelectorAll("li").length).toBe(0);
  });

  it("renders tasks in newest-first order", () => {
    createTask("first");
    createTask("second");

    const { container } = render(() => <TaskList />);
    const items = container.querySelectorAll("li");

    expect(items.length).toBe(2);
    expect(items[0]!.textContent).toBe("second");
    expect(items[1]!.textContent).toBe("first");
  });

  it("roving tabindex: only the focused-index row has tabindex=0 and data-focused=true", () => {
    createTask("first");
    createTask("second");
    createTask("third");
    setRowFocus(1);

    const { container } = render(() => <TaskList />);
    const items = container.querySelectorAll("li");

    expect(items[0]!.tabIndex).toBe(-1);
    expect(items[0]!.dataset.focused).toBe("false");
    expect(items[1]!.tabIndex).toBe(0);
    expect(items[1]!.dataset.focused).toBe("true");
    expect(items[2]!.tabIndex).toBe(-1);
    expect(items[2]!.dataset.focused).toBe("false");
  });

  it("roving tabindex shifts reactively when focused index changes", () => {
    createTask("first");
    createTask("second");
    createTask("third");
    setRowFocus(0);

    const { container } = render(() => <TaskList />);
    let items = container.querySelectorAll("li");
    expect(items[0]!.tabIndex).toBe(0);
    expect(items[2]!.tabIndex).toBe(-1);

    setRowFocus(2);
    items = container.querySelectorAll("li");
    expect(items[0]!.tabIndex).toBe(-1);
    expect(items[2]!.tabIndex).toBe(0);
    expect(items[2]!.dataset.focused).toBe("true");
  });
});
