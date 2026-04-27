import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { App } from "./App";
import { tasks, createTask, clearAllTasks } from "../store/task-store";
import {
  undoStack,
  pushUndo,
  clearUndoStack,
} from "../store/undo-stack";

describe("App global undo handler", () => {
  beforeEach(() => {
    clearAllTasks();
    clearUndoStack();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });

  afterEach(() => {
    cleanup();
  });

  it("pressing u applies undo when stack is non-empty", () => {
    createTask("test");
    const id = tasks[0]!.id;
    pushUndo({ inverseMutation: { type: "updateText", id, previousText: "old" } });

    render(() => <App />);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "u", bubbles: true }));

    expect(undoStack.length).toBe(0);
    expect(tasks[0]!.text).toBe("old");
  });

  it("pressing u with empty stack does not error", () => {
    render(() => <App />);
    expect(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "u", bubbles: true }));
    }).not.toThrow();
  });

  it("pressing u while focus is on an INPUT does not trigger undo", () => {
    createTask("task");
    const id = tasks[0]!.id;
    pushUndo({ inverseMutation: { type: "updateText", id, previousText: "old" } });

    const { container } = render(() => <App />);
    const input = container.querySelector("input[type=text]") as HTMLInputElement;
    input.focus();

    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "u", bubbles: true }),
    );

    expect(undoStack.length).toBe(1);
  });

  it("Cmd+u does not trigger undo", () => {
    createTask("task");
    const id = tasks[0]!.id;
    pushUndo({ inverseMutation: { type: "updateText", id, previousText: "old" } });

    render(() => <App />);
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "u", metaKey: true, bubbles: true }),
    );

    expect(undoStack.length).toBe(1);
  });

  it("listener is cleaned up on unmount", () => {
    createTask("task");
    const id = tasks[0]!.id;
    pushUndo({ inverseMutation: { type: "updateText", id, previousText: "old" } });

    const { unmount } = render(() => <App />);
    unmount();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "u", bubbles: true }));
    expect(undoStack.length).toBe(1);
  });
});
