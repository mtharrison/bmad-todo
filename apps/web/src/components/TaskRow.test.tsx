import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { TaskRow } from "./TaskRow";

describe("TaskRow", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders an li with the task text", () => {
    const task = { id: "x", text: "hello world", createdAt: 0 };
    const { container } = render(() => <TaskRow task={task} />);
    const li = container.querySelector("li");

    expect(li).not.toBeNull();
    expect(li!.textContent).toBe("hello world");
  });

  it("contains no input, svg, or button elements", () => {
    const task = { id: "x", text: "hello world", createdAt: 0 };
    const { container } = render(() => <TaskRow task={task} />);

    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelector("button")).toBeNull();
  });
});
