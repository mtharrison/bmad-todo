import { createSignal } from "solid-js";
import { tasks } from "./task-store";

const [focusedRowIndexSignal, setFocusedRowIndexInternal] = createSignal<number | null>(null);
const [editingTaskIdSignal, setEditingTaskIdInternal] = createSignal<string | null>(null);
const [captureInputRefSignal, setCaptureInputRefInternal] = createSignal<HTMLInputElement | null>(
  null,
);

export const focusedRowIndex = focusedRowIndexSignal;
export const editingTaskId = editingTaskIdSignal;
export const captureInputRef = captureInputRefSignal;

export function focusNextRow(): void {
  if (tasks.length === 0) return;
  const current = focusedRowIndexSignal();
  if (current === null) {
    setFocusedRowIndexInternal(0);
    return;
  }
  const next = current + 1;
  if (next < tasks.length) setFocusedRowIndexInternal(next);
}

export function focusPrevRow(): void {
  if (tasks.length === 0) return;
  const current = focusedRowIndexSignal();
  if (current === null) {
    setFocusedRowIndexInternal(0);
    return;
  }
  if (current > 0) setFocusedRowIndexInternal(current - 1);
}

export function clearRowFocus(): void {
  setFocusedRowIndexInternal(null);
}

export function setRowFocus(index: number | null): void {
  setFocusedRowIndexInternal(index);
}

export function setEditingTask(id: string | null): void {
  setEditingTaskIdInternal(id);
}

export function setCaptureInputRef(el: HTMLInputElement | null): void {
  setCaptureInputRefInternal(el);
}

export function focusCaptureLine(): void {
  setFocusedRowIndexInternal(null);
  const el = captureInputRefSignal();
  if (el) el.focus();
}

export function clearAllFocus(): void {
  setFocusedRowIndexInternal(null);
  setEditingTaskIdInternal(null);
  setCaptureInputRefInternal(null);
}
