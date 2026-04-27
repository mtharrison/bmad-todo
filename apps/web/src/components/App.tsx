import { onMount, onCleanup } from "solid-js";
import { CaptureLine } from "./CaptureLine";
import { TaskList } from "./TaskList";
import { applyUndo } from "../store/undo-stack";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function App() {
  onMount(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "u" && event.key !== "U") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.isComposing) return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      applyUndo();
    };
    window.addEventListener("keydown", handler);
    onCleanup(() => window.removeEventListener("keydown", handler));
  });

  return (
    <main class="app-main bg-paper text-ink">
      <CaptureLine />
      <TaskList />
    </main>
  );
}
