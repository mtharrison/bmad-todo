import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { App } from "./App";
import { tasks, createTask, clearAllTasks } from "../store/task-store";
import { undoStack, pushUndo, clearUndoStack } from "../store/undo-stack";
import { focusedRowIndex, editingTaskId, setRowFocus, clearAllFocus } from "../store/focus-store";
import { theme, setTheme } from "../store/theme-store";

function dispatchKey(
  init: {
    key: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    altKey?: boolean;
    isComposing?: boolean;
  },
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

    it("k from null with 3 tasks lands on 0 (AC#2 first-K-from-null)", () => {
      createTask("a");
      createTask("b");
      createTask("c");
      setupAndBlur();

      dispatchKey({ key: "k" });
      expect(focusedRowIndex()).toBe(0);
    });

    it("ArrowUp from null with tasks lands on 0", () => {
      createTask("a");
      createTask("b");
      setupAndBlur();

      dispatchKey({ key: "ArrowUp" });
      expect(focusedRowIndex()).toBe(0);
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

  describe("theme toggle (Story 1.8)", () => {
    beforeEach(() => {
      localStorage.clear();
      setTheme("light");
      document.documentElement.setAttribute("data-theme", "light");
    });

    it("t keystroke toggles theme when no editable target is focused", () => {
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();

      dispatchKey({ key: "t" });

      expect(theme()).toBe("dark");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    it("T (uppercase) also toggles", () => {
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();

      dispatchKey({ key: "T" });

      expect(theme()).toBe("dark");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    it("t typed inside CaptureLine does NOT toggle (AC#9 stickiness)", () => {
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.focus();

      dispatchKey({ key: "t" }, input);

      expect(theme()).toBe("light");
    });

    it("Cmd+t does NOT toggle (browser shortcut preserved)", () => {
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();

      dispatchKey({ key: "t", metaKey: true });

      expect(theme()).toBe("light");
    });

    it("Ctrl+t does NOT toggle", () => {
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      input.blur();

      dispatchKey({ key: "t", ctrlKey: true });

      expect(theme()).toBe("light");
    });

    it("renders a theme-toggle button with aria-label='Toggle theme'", () => {
      const { container } = render(() => <App />);
      const button = container.querySelector("button.theme-toggle") as HTMLButtonElement;
      expect(button).not.toBeNull();
      expect(button.getAttribute("aria-label")).toBe("Toggle theme");
    });

    it("clicking the button toggles theme and aria-pressed reflects state", () => {
      const { container } = render(() => <App />);
      const button = container.querySelector("button.theme-toggle") as HTMLButtonElement;

      expect(button.getAttribute("aria-pressed")).toBe("false");

      fireEvent.click(button);
      expect(theme()).toBe("dark");
      expect(button.getAttribute("aria-pressed")).toBe("true");

      fireEvent.click(button);
      expect(theme()).toBe("light");
      expect(button.getAttribute("aria-pressed")).toBe("false");
    });

    it("button.click() does NOT change document.activeElement", () => {
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      const button = container.querySelector("button.theme-toggle") as HTMLButtonElement;
      input.focus();
      expect(document.activeElement).toBe(input);

      button.click();

      expect(document.activeElement).toBe(input);
      expect(theme()).toBe("dark");
    });

    it("aria-pressed is 'false' in light, 'true' in dark", () => {
      const { container } = render(() => <App />);
      const button = container.querySelector("button.theme-toggle") as HTMLButtonElement;

      expect(button.getAttribute("aria-pressed")).toBe("false");

      setTheme("dark");
      expect(button.getAttribute("aria-pressed")).toBe("true");

      setTheme("light");
      expect(button.getAttribute("aria-pressed")).toBe("false");
    });

    it("AC#10 (a) — tab order: capture line → row (if any) → theme button (last tab stop)", () => {
      createTask("a");
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      const li = container.querySelector("li") as HTMLLIElement;
      const button = container.querySelector("button.theme-toggle") as HTMLButtonElement;

      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(
          'input, button, [tabindex="0"]',
        ),
      );
      const inputIdx = focusables.indexOf(input);
      const liIdx = focusables.indexOf(li);
      const buttonIdx = focusables.indexOf(button);

      expect(inputIdx).toBeGreaterThanOrEqual(0);
      expect(liIdx).toBeGreaterThan(inputIdx);
      expect(buttonIdx).toBeGreaterThan(liIdx);
      expect(buttonIdx).toBe(focusables.length - 1);
    });

    it("AC#10 (a) — with no rows, theme button is the next tab stop after capture line", () => {
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      const button = container.querySelector("button.theme-toggle") as HTMLButtonElement;

      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(
          'input, button, [tabindex="0"]',
        ),
      );
      const inputIdx = focusables.indexOf(input);
      const buttonIdx = focusables.indexOf(button);

      expect(buttonIdx).toBe(inputIdx + 1);
    });

    it("onMouseDown preventDefault: pointer-down on toggle keeps focus on prior element", () => {
      const { container } = render(() => <App />);
      const input = container.querySelector("input[type=text]") as HTMLInputElement;
      const button = container.querySelector("button.theme-toggle") as HTMLButtonElement;
      input.focus();

      const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
      const defaulted = !button.dispatchEvent(event);

      expect(defaulted).toBe(true);
      expect(document.activeElement).toBe(input);
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
