import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { TaskList } from "./TaskList";
import { clearAllTasks, createTask } from "../store/task-store";

describe("TaskList", () => {
  beforeEach(() => {
    clearAllTasks();
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
});
