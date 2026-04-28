import { onMount, onCleanup } from "solid-js";
import { createTask } from "../store/task-store";
import { setCaptureInputRef } from "../store/focus-store";
import { latencyTracker } from "../lib/latency";

export function CaptureLine() {
  let inputEl: HTMLInputElement | undefined;

  onMount(() => {
    setCaptureInputRef(inputEl ?? null);
    // mobile: no auto-focus per UX spec
    if (window.matchMedia("(max-width: 639px)").matches) return;
    inputEl?.focus();
  });

  onCleanup(() => {
    setCaptureInputRef(null);
  });

  function handleKeyDown(event: KeyboardEvent) {
    if (!inputEl) return;
    if (event.metaKey || event.ctrlKey) return;
    if (event.isComposing) return;

    if (event.key === "Enter") {
      event.preventDefault();
      if (inputEl.value.trim().length === 0) return;
      createTask(inputEl.value);
      inputEl.value = "";
      inputEl.focus();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      inputEl.value = "";
      return;
    }

    if (latencyTracker.isActive() && event.key.length === 1) {
      latencyTracker.recordKeystrokeStart();
      requestAnimationFrame(() => latencyTracker.recordKeystrokeEnd());
    }
  }

  return (
    <input
      ref={inputEl}
      type="text"
      class="capture-line"
      aria-label="Add a task"
      autocomplete="off"
      spellcheck={true}
      enterkeyhint="done"
      onKeyDown={handleKeyDown}
    />
  );
}
