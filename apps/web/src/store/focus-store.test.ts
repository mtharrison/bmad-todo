import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  focusedRowIndex,
  editingTaskId,
  captureInputRef,
  focusNextRow,
  focusPrevRow,
  setRowFocus,
  clearRowFocus,
  setEditingTask,
  setCaptureInputRef,
  focusCaptureLine,
  clearAllFocus,
} from "./focus-store";
import { clearAllTasks, createTask } from "./task-store";

describe("focus-store", () => {
  beforeEach(() => {
    clearAllTasks();
    clearAllFocus();
  });

  it("initial state: all signals are null", () => {
    expect(focusedRowIndex()).toBeNull();
    expect(editingTaskId()).toBeNull();
    expect(captureInputRef()).toBeNull();
  });

  it("focusNextRow on empty tasks does nothing", () => {
    focusNextRow();
    expect(focusedRowIndex()).toBeNull();
  });

  it("focusNextRow from null with tasks lands on 0", () => {
    createTask("a");
    createTask("b");
    createTask("c");
    focusNextRow();
    expect(focusedRowIndex()).toBe(0);
  });

  it("focusNextRow advances and clamps at last index without wrapping", () => {
    createTask("a");
    createTask("b");
    createTask("c");
    focusNextRow();
    expect(focusedRowIndex()).toBe(0);
    focusNextRow();
    expect(focusedRowIndex()).toBe(1);
    focusNextRow();
    expect(focusedRowIndex()).toBe(2);
    focusNextRow();
    expect(focusedRowIndex()).toBe(2);
  });

  it("focusPrevRow from null with tasks lands on 0 (parity with j)", () => {
    createTask("a");
    createTask("b");
    focusPrevRow();
    expect(focusedRowIndex()).toBe(0);
  });

  it("focusPrevRow on empty tasks does nothing", () => {
    focusPrevRow();
    expect(focusedRowIndex()).toBeNull();
  });

  it("focusPrevRow decrements and clamps at 0", () => {
    createTask("a");
    createTask("b");
    createTask("c");
    setRowFocus(2);
    focusPrevRow();
    expect(focusedRowIndex()).toBe(1);
    focusPrevRow();
    expect(focusedRowIndex()).toBe(0);
    focusPrevRow();
    expect(focusedRowIndex()).toBe(0);
  });

  it("setRowFocus accepts arbitrary index without clamping (callers validate)", () => {
    setRowFocus(5);
    expect(focusedRowIndex()).toBe(5);
    setRowFocus(null);
    expect(focusedRowIndex()).toBeNull();
  });

  it("clearRowFocus sets focusedRowIndex to null", () => {
    setRowFocus(2);
    clearRowFocus();
    expect(focusedRowIndex()).toBeNull();
  });

  it("setEditingTask sets and clears editingTaskId", () => {
    setEditingTask("abc");
    expect(editingTaskId()).toBe("abc");
    setEditingTask(null);
    expect(editingTaskId()).toBeNull();
  });

  it("setCaptureInputRef stores and clears the ref", () => {
    const fakeInput = { focus: vi.fn() } as unknown as HTMLInputElement;
    setCaptureInputRef(fakeInput);
    expect(captureInputRef()).toBe(fakeInput);
    setCaptureInputRef(null);
    expect(captureInputRef()).toBeNull();
  });

  it("focusCaptureLine clears row focus AND focuses the registered input", () => {
    const focusFn = vi.fn();
    const fakeInput = { focus: focusFn } as unknown as HTMLInputElement;
    setCaptureInputRef(fakeInput);
    setRowFocus(2);
    focusCaptureLine();
    expect(focusedRowIndex()).toBeNull();
    expect(focusFn).toHaveBeenCalledTimes(1);
  });

  it("focusCaptureLine with no registered input does not throw", () => {
    setRowFocus(0);
    expect(() => focusCaptureLine()).not.toThrow();
    expect(focusedRowIndex()).toBeNull();
  });

  it("clearAllFocus resets all three signals", () => {
    setRowFocus(2);
    setEditingTask("xyz");
    setCaptureInputRef({ focus: vi.fn() } as unknown as HTMLInputElement);
    clearAllFocus();
    expect(focusedRowIndex()).toBeNull();
    expect(editingTaskId()).toBeNull();
    expect(captureInputRef()).toBeNull();
  });
});
