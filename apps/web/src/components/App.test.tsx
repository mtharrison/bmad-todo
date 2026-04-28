import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { App } from "./App";
import { tasks, createTask, clearAllTasks } from "../store/task-store";
import { undoStack, pushUndo, clearUndoStack } from "../store/undo-stack";
import {
  focusedRowIndex,
  editingTaskId,
  setRowFocus,
  clearAllFocus,
} from "../store/focus-store";

function dispatchKey(
  init: { key: string; metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean; isComposing?: boolean },
  target: EventTarget = window,
) {
  target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, ...init }));
}

describe("App global keyboard handler", () => {
  beforeEach(() => {
    clearAllTasks();
    clearUndoStack();
    clearAllFocus();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false } as MediaQueryList);
  });

  afterEach(() => {
    cleanup();
  });

  describe("undo (carry-forward from 1.6)", () => {
    it("pressing u applies undo when stack is non-empty", () => {
      createTask("test");
      const id = tasks[0]!.id;
      pushUndo({ inverseMutation: { type: "updateText", id, previousText: "old" } });

      const { container } = render(() => <App />);
      // Move focus off the capture line so the global handler runs
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();
      dispatchKey({ key: "u" });

      expect(undoStack.length).toBe(0);
      expect(tasks[0]!.text).toBe("old");
    });

    it("pressing u with empty stack does not error", () => {
      render(() => <App />);
      expect(() => dispatchKey({ key: "u" })).not.toThrow();
    });

    it("pressing u while focus is on an INPUT does not trigger undo", () => {
      createTask("task");
      const id = tasks[0]!.id;
      pushUndo({ inverseMutation: { type: "updateText", id, previousText: "old" } });

      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.focus();
      dispatchKey({ key: "u" }, input);

      expect(undoStack.length).toBe(1);
    });

    it("Cmd+u does not trigger undo (browser shortcut precedence)", () => {
      createTask("task");
      const id = tasks[0]!.id;
      pushUndo({ inverseMutation: { type: "updateText", id, previousText: "old" } });

      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();
      dispatchKey({ key: "u", metaKey: true });

      expect(undoStack.length).toBe(1);
    });

    it("listener is cleaned up on unmount", () => {
      createTask("task");
      const id = tasks[0]!.id;
      pushUndo({ inverseMutation: { type: "updateText", id, previousText: "old" } });

      const { unmount } = render(() => <App />);
      unmount();
      dispatchKey({ key: "u" });

      expect(undoStack.length).toBe(1);
    });
  });

  describe("navigation: j / k / ArrowDown / ArrowUp", () => {
    function setupAndBlur() {
      const result = render(() => <App />);
      const input = result.container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();
      return result;
    }

    it("j from null with 3 tasks lands on 0, advances to 2, clamps", () => {
      createTask("a");
      createTask("b");
      createTask("c");
      setupAndBlur();

      dispatchKey({ key: "j" });
      expect(focusedRowIndex()).toBe(0);
      dispatchKey({ key: "j" });
      expect(focusedRowIndex()).toBe(1);
      dispatchKey({ key: "j" });
      expect(focusedRowIndex()).toBe(2);
      dispatchKey({ key: "j" });
      expect(focusedRowIndex()).toBe(2);
    });

    it("k from 2 decrements to 0, clamps", () => {
      createTask("a");
      createTask("b");
      createTask("c");
      setupAndBlur();
      setRowFocus(2);

      dispatchKey({ key: "k" });
      expect(focusedRowIndex()).toBe(1);
      dispatchKey({ key: "k" });
      expect(focusedRowIndex()).toBe(0);
      dispatchKey({ key: "k" });
      expect(focusedRowIndex()).toBe(0);
    });

    it("ArrowDown / ArrowUp aliases behave like j / k", () => {
      createTask("a");
      createTask("b");
      setupAndBlur();

      dispatchKey({ key: "ArrowDown" });
      expect(focusedRowIndex()).toBe(0);
      dispatchKey({ key: "ArrowDown" });
      expect(focusedRowIndex()).toBe(1);
      dispatchKey({ key: "ArrowUp" });
      expect(focusedRowIndex()).toBe(0);
    });

    it("J (capital) and K also navigate", () => {
      createTask("a");
      createTask("b");
      setupAndBlur();

      dispatchKey({ key: "J" });
      expect(focusedRowIndex()).toBe(0);
      dispatchKey({ key: "J" });
      expect(focusedRowIndex()).toBe(1);
      dispatchKey({ key: "K" });
      expect(focusedRowIndex()).toBe(0);
    });
  });

  describe("n / Cmd+Enter focus capture line (AC#4)", () => {
    it("pressing n with a row focused returns focus to the capture line", () => {
      createTask("a");
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();
      setRowFocus(0);

      dispatchKey({ key: "n" });

      expect(focusedRowIndex()).toBeNull();
      expect(document.activeElement).toBe(input);
    });

    it("Cmd+Enter focuses capture line", () => {
      createTask("a");
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();
      setRowFocus(0);

      dispatchKey({ key: "Enter", metaKey: true });

      expect(focusedRowIndex()).toBeNull();
      expect(document.activeElement).toBe(input);
    });

    it("Ctrl+Enter focuses capture line (non-mac equivalent)", () => {
      createTask("a");
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();
      setRowFocus(0);

      dispatchKey({ key: "Enter", ctrlKey: true });

      expect(document.activeElement).toBe(input);
    });

    it("Cmd+Enter while typing in capture line does NOT create a task", () => {
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.value = "draft";
      input.focus();

      dispatchKey({ key: "Enter", metaKey: true }, input);

      expect(tasks.length).toBe(0);
    });
  });

  describe("x toggles focused row (AC#3)", () => {
    it("x with focused row toggles completion and pushes undo", () => {
      createTask("a");
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();
      setRowFocus(0);

      dispatchKey({ key: "x" });

      expect(tasks[0]!.completedAt).toBeTypeOf("number");
      expect(undoStack.length).toBe(1);
      expect(undoStack[0]!.inverseMutation.type).toBe("setCompletedAt");
    });

    it("X (capital) also toggles", () => {
      createTask("a");
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();
      setRowFocus(0);

      dispatchKey({ key: "X" });
      expect(tasks[0]!.completedAt).toBeTypeOf("number");
    });

    it("x with no focused row does nothing", () => {
      createTask("a");
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();

      dispatchKey({ key: "x" });

      expect(tasks[0]!.completedAt).toBeNull();
      expect(undoStack.length).toBe(0);
    });

    it("Cmd+x is a no-op (browser shortcut precedence)", () => {
      createTask("a");
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();
      setRowFocus(0);

      dispatchKey({ key: "x", metaKey: true });
      expect(tasks[0]!.completedAt).toBeNull();
    });
  });

  describe("e enters edit mode (AC#3)", () => {
    it("pressing e on focused row sets editingTaskId", () => {
      createTask("a");
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();
      setRowFocus(0);

      dispatchKey({ key: "e" });

      expect(editingTaskId()).toBe(tasks[0]!.id);
    });

    it("e with no focused row does nothing", () => {
      createTask("a");
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();

      dispatchKey({ key: "e" });
      expect(editingTaskId()).toBeNull();
    });
  });

  describe("d deletes focused row with focus adjustment (AC#3, AC#9)", () => {
    it("d on a middle row keeps focusedRowIndex (next-newer slid up)", () => {
      createTask("a"); // tasks[2]
      createTask("b"); // tasks[1]
      createTask("c"); // tasks[0]
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();
      setRowFocus(1);

      dispatchKey({ key: "d" });

      expect(tasks.length).toBe(2);
      expect(focusedRowIndex()).toBe(1);
      expect(undoStack.length).toBe(1);
      expect(undoStack[0]!.inverseMutation.type).toBe("insert");
    });

    it("d on the last row moves focus up to new last index", () => {
      createTask("a");
      createTask("b");
      createTask("c");
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();
      setRowFocus(2);

      dispatchKey({ key: "d" });

      expect(tasks.length).toBe(2);
      expect(focusedRowIndex()).toBe(1);
    });

    it("d on the only row clears focus", () => {
      createTask("a");
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();
      setRowFocus(0);

      dispatchKey({ key: "d" });

      expect(tasks.length).toBe(0);
      expect(focusedRowIndex()).toBeNull();
    });

    it("d with no focused row does nothing", () => {
      createTask("a");
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();

      dispatchKey({ key: "d" });
      expect(tasks.length).toBe(1);
    });
  });

  describe("capture-line stickiness (AC#5)", () => {
    function setupTaskWithCaptureFocus() {
      createTask("existing");
      const result = render(() => <App />);
      const input = result.container.querySelector("input[type=text]") as HTMLInputElement;
      input.focus();
      return { input };
    }

    it.each(["j", "k", "x", "u", "d", "e"])(
      "%s typed in capture line does NOT navigate or mutate",
      (key) => {
        const { input } = setupTaskWithCaptureFocus();
        const before = tasks[0]!.completedAt;

        dispatchKey({ key }, input);

        expect(focusedRowIndex()).toBeNull();
        expect(editingTaskId()).toBeNull();
        expect(tasks.length).toBe(1);
        expect(tasks[0]!.completedAt).toBe(before);
      },
    );
  });

  describe("two-cursor independence (AC#6)", () => {
    it("toggling focused row preserves capture-line value and selection", () => {
      createTask("existing");
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.value = "buy oat";
      input.focus();
      input.setSelectionRange(3, 3);

      // Move list focus to row 0 (without leaving the capture input as activeElement)
      setRowFocus(0);

      // Dispatch x with the row li as the target (simulating list-focused keydown)
      const li = container.querySelector("li")!;
      dispatchKey({ key: "x" }, li);

      expect(tasks[0]!.completedAt).toBeTypeOf("number");
      expect(input.value).toBe("buy oat");
      expect(input.selectionStart).toBe(3);
      expect(input.selectionEnd).toBe(3);
    });
  });

  describe("IME guard (AC#3 regression)", () => {
    it("isComposing keystrokes are ignored", () => {
      createTask("a");
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();
      setRowFocus(0);

      dispatchKey({ key: "x", isComposing: true });

      expect(tasks[0]!.completedAt).toBeNull();
      expect(undoStack.length).toBe(0);
    });
  });
});
