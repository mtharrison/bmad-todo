import { syncState } from "../store/annunciator-store";
import { flushOutbox } from "../store/task-store";

const LABELS: Record<string, string> = {
  offline: "Offline",
  conflict: "Sync conflict",
  error: "Storage error",
};

export function Annunciator() {
  const label = () => LABELS[syncState()] ?? "";
  const surfaced = () => syncState() !== "online";

  const handleClick = () => {
    if (surfaced()) void flushOutbox();
  };

  return (
    <div
      class="annunciator"
      role="status"
      aria-live="polite"
      data-state={syncState()}
      tabindex={surfaced() ? "0" : undefined}
      onClick={handleClick}
      onMouseDown={(e) => e.preventDefault()}
    >
      <span class="annunciator-dot" />
      <span class="annunciator-label">{label()}</span>
    </div>
  );
}
