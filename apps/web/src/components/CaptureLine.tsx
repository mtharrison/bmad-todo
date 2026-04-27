import { onMount } from "solid-js";
import { createTask } from "../store/task-store";

export function CaptureLine() {
  let inputEl: HTMLInputElement | undefined;

  onMount(() => {
    // mobile: no auto-focus per UX spec
    if (window.matchMedia("(max-width: 639px)").matches) return;
    inputEl?.focus();
  });

  function handleKeyDown(event: KeyboardEvent) {
    if (!inputEl) return;
    if (event.key === "Enter") {
      event.preventDefault();
      createTask(inputEl.value);
      inputEl.value = "";
      inputEl.focus();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      inputEl.value = "";
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
