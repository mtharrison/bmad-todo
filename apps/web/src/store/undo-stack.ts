import { createStore } from "solid-js/store";
import type { ActiveTask } from "./task-store";
import { insertTaskAtIndex, updateTaskText, setTaskCompletedAt } from "./task-store";

export type InverseMutation =
  | { type: "insert"; task: ActiveTask; index: number }
  | { type: "updateText"; id: string; previousText: string }
  | { type: "setCompletedAt"; id: string; previousCompletedAt: number | null };

export type UndoEntry = {
  inverseMutation: InverseMutation;
  timestamp: number;
};

const [undoStackStore, setUndoStack] = createStore<UndoEntry[]>([]);

export { undoStackStore as undoStack };

export function pushUndo(entry: { inverseMutation: InverseMutation; timestamp?: number }): void {
  const full: UndoEntry = {
    inverseMutation: entry.inverseMutation,
    timestamp: entry.timestamp ?? Date.now(),
  };
  setUndoStack((prev) => [...prev, full]);
}

export function popUndo(): UndoEntry | undefined {
  const len = undoStackStore.length;
  if (len === 0) return undefined;
  const last = undoStackStore[len - 1]!;
  const raw = last.inverseMutation;
  const inverseMutation: InverseMutation =
    raw.type === "insert"
      ? { type: "insert", task: { ...raw.task }, index: raw.index }
      : ({ ...raw } as InverseMutation);
  const entry: UndoEntry = { inverseMutation, timestamp: last.timestamp };
  setUndoStack((prev) => prev.slice(0, -1));
  return entry;
}

function applyInverseMutation(m: InverseMutation): void {
  switch (m.type) {
    case "insert":
      insertTaskAtIndex(m.task, m.index);
      return;
    case "updateText":
      updateTaskText(m.id, m.previousText);
      return;
    case "setCompletedAt":
      setTaskCompletedAt(m.id, m.previousCompletedAt);
      return;
  }
}

export function applyUndo(): boolean {
  const entry = popUndo();
  if (!entry) return false;
  applyInverseMutation(entry.inverseMutation);
  return true;
}

export function clearUndoStack(): void {
  setUndoStack(() => []);
}
