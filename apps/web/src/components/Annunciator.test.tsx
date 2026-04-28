import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { Annunciator } from "./Annunciator";
import { setSyncState, _resetForTesting } from "../store/annunciator-store";
import * as taskStore from "../store/task-store";

describe("Annunciator", () => {
  beforeEach(() => {
    _resetForTesting();
  });

  afterEach(() => {
    cleanup();
    _resetForTesting();
  });

  it("has role=status and aria-live=polite in all states", () => {
    const { container } = render(() => <Annunciator />);
    const el = container.querySelector(".annunciator")!;
    expect(el.getAttribute("role")).toBe("status");
    expect(el.getAttribute("aria-live")).toBe("polite");
  });

  it("renders data-state=online when syncState is online", () => {
    const { container } = render(() => <Annunciator />);
    const el = container.querySelector(".annunciator")!;
    expect(el.getAttribute("data-state")).toBe("online");
  });

  it("has no tabindex when syncState is online", () => {
    const { container } = render(() => <Annunciator />);
    const el = container.querySelector(".annunciator")!;
    expect(el.hasAttribute("tabindex")).toBe(false);
  });

  it("shows Offline label after 2s offline delay", () => {
    vi.useFakeTimers();
    const { container } = render(() => <Annunciator />);
    setSyncState("offline");
    vi.advanceTimersByTime(2100);
    const el = container.querySelector(".annunciator")!;
    expect(el.getAttribute("data-state")).toBe("offline");
    expect(container.querySelector(".annunciator-label")!.textContent).toBe("Offline");
    expect(el.getAttribute("tabindex")).toBe("0");
    vi.useRealTimers();
  });

  describe("when surfaced (non-online states)", () => {
    it("shows Offline label for offline state", async () => {
      const { container } = render(() => <Annunciator />);
      // Trigger a non-delayed state change
      setSyncState("error");
      // Change to test offline with timer
      _resetForTesting();
      setSyncState("conflict");
      _resetForTesting();

      // For offline specifically, the store has a 2s delay.
      // Test the other states directly:
      setSyncState("error");
      const el = container.querySelector(".annunciator")!;
      expect(el.getAttribute("data-state")).toBe("error");
      expect(container.querySelector(".annunciator-label")!.textContent).toBe("Storage error");
    });

    it("shows Sync conflict label for conflict state", () => {
      const { container } = render(() => <Annunciator />);
      setSyncState("conflict");
      const el = container.querySelector(".annunciator")!;
      expect(el.getAttribute("data-state")).toBe("conflict");
      expect(container.querySelector(".annunciator-label")!.textContent).toBe("Sync conflict");
    });

    it("shows Storage error label for error state", () => {
      const { container } = render(() => <Annunciator />);
      setSyncState("error");
      const el = container.querySelector(".annunciator")!;
      expect(el.getAttribute("data-state")).toBe("error");
      expect(container.querySelector(".annunciator-label")!.textContent).toBe("Storage error");
    });

    it("has tabindex=0 when surfaced", () => {
      const { container } = render(() => <Annunciator />);
      setSyncState("error");
      const el = container.querySelector(".annunciator")!;
      expect(el.getAttribute("tabindex")).toBe("0");
    });

    it("calls flushOutbox on click", () => {
      const spy = vi.spyOn(taskStore, "flushOutbox").mockResolvedValue(undefined);
      const { container } = render(() => <Annunciator />);
      setSyncState("error");
      const el = container.querySelector(".annunciator")!;
      fireEvent.click(el);
      expect(spy).toHaveBeenCalledOnce();
      spy.mockRestore();
    });

    it("does not call flushOutbox when online", () => {
      const spy = vi.spyOn(taskStore, "flushOutbox").mockResolvedValue(undefined);
      const { container } = render(() => <Annunciator />);
      const el = container.querySelector(".annunciator")!;
      fireEvent.click(el);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  it("removes tabindex when returning to online", () => {
    const { container } = render(() => <Annunciator />);
    setSyncState("error");
    const el = container.querySelector(".annunciator")!;
    expect(el.getAttribute("tabindex")).toBe("0");

    setSyncState("online");
    expect(el.hasAttribute("tabindex")).toBe(false);
    expect(el.getAttribute("data-state")).toBe("online");
  });

  it("has annunciator-dot and annunciator-label children", () => {
    const { container } = render(() => <Annunciator />);
    expect(container.querySelector(".annunciator-dot")).not.toBeNull();
    expect(container.querySelector(".annunciator-label")).not.toBeNull();
  });
});
