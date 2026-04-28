import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { DevLatencyDisplay, setDevModeVisible } from "./DevLatencyDisplay";
import { latencyTracker } from "../lib/latency";

afterEach(() => {
  cleanup();
  setDevModeVisible(false);
  latencyTracker._reset();
});

describe("DevLatencyDisplay", () => {
  it("renders nothing when dev mode is not active", () => {
    const { container } = render(() => <DevLatencyDisplay />);
    expect(container.querySelector(".dev-latency-display")).toBeNull();
  });

  it("renders with aria-hidden=true when dev mode is active", () => {
    setDevModeVisible(true);
    const { container } = render(() => <DevLatencyDisplay />);
    const el = container.querySelector(".dev-latency-display");
    expect(el).not.toBeNull();
    expect(el!.getAttribute("aria-hidden")).toBe("true");
  });

  it("displays latency values when tracker has data", () => {
    vi.useFakeTimers();
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);

    latencyTracker.setActive(true);
    now = 0;
    latencyTracker.recordKeystrokeStart();
    now = 12;
    latencyTracker.recordKeystrokeEnd();

    now = 0;
    latencyTracker.recordCompletionStart();
    now = 30;
    latencyTracker.recordCompletionEnd();

    setDevModeVisible(true);
    const { container } = render(() => <DevLatencyDisplay />);

    vi.advanceTimersByTime(300);

    const values = container.querySelectorAll(".dev-latency-value");
    expect(values.length).toBe(2);
    expect(values[0]!.textContent).toBe("12.0ms");
    expect(values[1]!.textContent).toBe("30.0ms");

    vi.useRealTimers();
  });

  it("marks values over budget with data-over-budget", () => {
    vi.useFakeTimers();
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);

    latencyTracker.setActive(true);
    now = 0;
    latencyTracker.recordKeystrokeStart();
    now = 20;
    latencyTracker.recordKeystrokeEnd();

    setDevModeVisible(true);
    const { container } = render(() => <DevLatencyDisplay />);

    vi.advanceTimersByTime(300);

    const keystrokeValue = container.querySelectorAll(".dev-latency-value")[0]!;
    expect(keystrokeValue.getAttribute("data-over-budget")).toBe("true");

    vi.useRealTimers();
  });

  it("shows two rows with correct labels", () => {
    setDevModeVisible(true);
    const { container } = render(() => <DevLatencyDisplay />);
    const labels = container.querySelectorAll(".dev-latency-label");
    expect(labels.length).toBe(2);
    expect(labels[0]!.textContent).toContain("Keystroke");
    expect(labels[1]!.textContent).toContain("Complete");
  });

  it("shows budget labels", () => {
    setDevModeVisible(true);
    const { container } = render(() => <DevLatencyDisplay />);
    const budgets = container.querySelectorAll(".dev-latency-budget");
    expect(budgets[0]!.textContent).toBe("/ 16ms");
    expect(budgets[1]!.textContent).toBe("/ 50ms");
  });
});
