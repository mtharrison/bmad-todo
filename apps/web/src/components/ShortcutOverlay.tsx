import { createSignal, Show, onMount } from "solid-js";

export const [overlayOpen, setOverlayOpen] = createSignal(false);

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "Cmd" : "Ctrl";

const SHORTCUTS: Array<{ key: string; action: string }> = [
  { key: "?", action: "Show keyboard shortcuts" },
  { key: "n", action: "New task / focus capture line" },
  { key: "j / ArrowDown", action: "Next task" },
  { key: "k / ArrowUp", action: "Previous task" },
  { key: "x", action: "Toggle complete" },
  { key: "e", action: "Edit task" },
  { key: "d", action: "Delete task" },
  { key: "u", action: "Undo" },
  { key: "t", action: "Toggle theme" },
  { key: `${mod}+Enter`, action: "Focus capture line" },
  { key: "Escape", action: "Close overlay / cancel edit" },
  { key: `${mod}+Shift+L`, action: "Dev latency display" },
];

export function ShortcutOverlay() {
  return (
    <Show when={overlayOpen()}>
      <ShortcutOverlayDialog />
    </Show>
  );
}

function ShortcutOverlayDialog() {
  let dialogRef: HTMLDivElement | undefined;

  onMount(() => {
    dialogRef?.focus();
  });

  const onScrimClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      setOverlayOpen(false);
    }
  };

  const onScrimMouseDown = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
    }
  };

  const onDialogKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
    }
  };

  return (
    <div class="shortcut-overlay-scrim" onClick={onScrimClick} onMouseDown={onScrimMouseDown}>
      <div
        ref={dialogRef}
        class="shortcut-overlay-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-overlay-heading"
        tabindex="-1"
        onKeyDown={onDialogKeyDown}
      >
        <h2 id="shortcut-overlay-heading" class="shortcut-overlay-title">
          Keyboard Shortcuts
        </h2>
        <dl class="shortcut-overlay-list">
          {SHORTCUTS.map((s) => (
            <div class="shortcut-overlay-row">
              <dt class="shortcut-overlay-key">
                {s.key.split(" / ").map((k, i) => (
                  <>
                    {i > 0 && " / "}
                    <kbd>{k}</kbd>
                  </>
                ))}
              </dt>
              <dd class="shortcut-overlay-action">{s.action}</dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          class="shortcut-overlay-close"
          aria-label="Close"
          onClick={() => setOverlayOpen(false)}
        >
          &times;
        </button>
      </div>
    </div>
  );
}
