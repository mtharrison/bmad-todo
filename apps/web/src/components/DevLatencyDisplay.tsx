import { createSignal, onCleanup, Show } from "solid-js";
import { latencyTracker } from "../lib/latency";

export const [devModeVisible, setDevModeVisible] = createSignal(false);

export function DevLatencyDisplay() {
  return (
    <Show when={devModeVisible()}>
      <DevLatencyPanel />
    </Show>
  );
}

function DevLatencyPanel() {
  const [keystrokeP95, setKeystrokeP95] = createSignal(0);
  const [completionP95, setCompletionP95] = createSignal(0);

  const interval = setInterval(() => {
    setKeystrokeP95(latencyTracker.getKeystrokeP95());
    setCompletionP95(latencyTracker.getCompletionP95());
  }, 250);

  onCleanup(() => clearInterval(interval));

  return (
    <div class="dev-latency-display" aria-hidden="true">
      <div class="dev-latency-row">
        <span class="dev-latency-label">Keystroke → render</span>
        <span class="dev-latency-value" data-over-budget={keystrokeP95() > 16 ? "true" : undefined}>
          {keystrokeP95().toFixed(1)}ms
        </span>
        <span class="dev-latency-budget">/ 16ms</span>
      </div>
      <div class="dev-latency-row">
        <span class="dev-latency-label">Complete → strike</span>
        <span
          class="dev-latency-value"
          data-over-budget={completionP95() > 50 ? "true" : undefined}
        >
          {completionP95().toFixed(1)}ms
        </span>
        <span class="dev-latency-budget">/ 50ms</span>
      </div>
    </div>
  );
}
