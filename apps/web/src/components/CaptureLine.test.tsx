import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@solidjs/testing-library";
import { CaptureLine } from "./CaptureLine";
import * as taskStore from "../store/task-store";
import { captureInputRef, clearAllFocus } from "../store/focus-store";

describe("CaptureLine", () => {
  beforeEach(() => {
    taskStore.clearAllTasks();
    clearAllFocus();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders an input with the documented attributes", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
    } as MediaQueryList);

    const { container } = render(() => <CaptureLine />);
    const input = container.querySelector("input");

    expect(input).not.toBeNull();
    expect(input!.type).toBe("text");
    expect(input!.getAttribute("aria-label")).toBe("Add a task");
    expect(input!.getAttribute("autocomplete")).toBe("off");
    expect(input!.getAttribute("spellcheck")).toBe("true");
    expect(input!.getAttribute("enterkeyhint")).toBe("done");
  });

  it("commits on Enter with non-empty value and clears input", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
    } as MediaQueryList);

    const spy = vi.spyOn(taskStore, "createTask");
    const { container } = render(() => <CaptureLine />);
    const input = container.querySelector("input")!;

    input.value = "Buy oat milk";
    fireEvent.keyDown(input, { key: "Enter" });

    expect(spy).toHaveBeenCalledWith("Buy oat milk");
    expect(input.value).toBe("");
  });

  it("does not commit whitespace-only Enter", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
    } as MediaQueryList);

    const spy = vi.spyOn(taskStore, "createTask");
    const { container } = render(() => <CaptureLine />);
    const input = container.querySelector("input")!;

    input.value = "   ";
    fireEvent.keyDown(input, { key: "Enter" });

    expect(spy).not.toHaveBeenCalled();
    expect(input.value).toBe("   ");
    expect(taskStore.tasks.length).toBe(0);
  });

  it("clears input on Escape without committing", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
    } as MediaQueryList);

    const spy = vi.spyOn(taskStore, "createTask");
    const { container } = render(() => <CaptureLine />);
    const input = container.querySelector("input")!;

    input.value = "draft text";
    fireEvent.keyDown(input, { key: "Escape" });

    expect(spy).not.toHaveBeenCalled();
    expect(input.value).toBe("");
  });

  it("auto-focuses on desktop viewport", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
    } as MediaQueryList);

    const { container } = render(() => <CaptureLine />);
    const input = container.querySelector("input")!;

    expect(document.activeElement).toBe(input);
  });

  it("skips auto-focus on mobile viewport", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
    } as MediaQueryList);

    const { container } = render(() => <CaptureLine />);
    const input = container.querySelector("input")!;

    expect(document.activeElement).not.toBe(input);
  });

  it("Cmd+Enter while typing does NOT call createTask (App owns the shortcut)", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
    } as MediaQueryList);

    const spy = vi.spyOn(taskStore, "createTask");
    const { container } = render(() => <CaptureLine />);
    const input = container.querySelector("input")!;

    input.value = "draft";
    fireEvent.keyDown(input, { key: "Enter", metaKey: true });

    expect(spy).not.toHaveBeenCalled();
    expect(input.value).toBe("draft");
    expect(taskStore.tasks.length).toBe(0);
  });

  it("Ctrl+Enter while typing also does NOT call createTask", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
    } as MediaQueryList);

    const spy = vi.spyOn(taskStore, "createTask");
    const { container } = render(() => <CaptureLine />);
    const input = container.querySelector("input")!;

    input.value = "draft";
    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

    expect(spy).not.toHaveBeenCalled();
  });

  it("registers the input ref with the focus-store on mount and clears on unmount", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
    } as MediaQueryList);

    const { container, unmount } = render(() => <CaptureLine />);
    const input = container.querySelector("input")!;

    expect(captureInputRef()).toBe(input);

    unmount();
    expect(captureInputRef()).toBeNull();
  });
});
