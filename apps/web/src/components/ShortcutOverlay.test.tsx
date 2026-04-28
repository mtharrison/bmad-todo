import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { ShortcutOverlay, setOverlayOpen } from "./ShortcutOverlay";

afterEach(() => {
  cleanup();
  setOverlayOpen(false);
});

describe("ShortcutOverlay", () => {
  it("renders nothing when closed", () => {
    const { container } = render(() => <ShortcutOverlay />);
    expect(container.querySelector("[role='dialog']")).toBeNull();
  });

  it("renders dialog with correct ARIA attributes when open", () => {
    setOverlayOpen(true);
    const { container } = render(() => <ShortcutOverlay />);
    const dialog = container.querySelector("[role='dialog']");
    expect(dialog).not.toBeNull();
    expect(dialog!.getAttribute("aria-modal")).toBe("true");
    expect(dialog!.getAttribute("aria-labelledby")).toBe("shortcut-overlay-heading");
  });

  it("has heading with correct id", () => {
    setOverlayOpen(true);
    const { container } = render(() => <ShortcutOverlay />);
    const heading = container.querySelector("#shortcut-overlay-heading");
    expect(heading).not.toBeNull();
    expect(heading!.textContent).toBe("Keyboard Shortcuts");
  });

  it("renders all expected shortcuts with kbd elements", () => {
    setOverlayOpen(true);
    const { container } = render(() => <ShortcutOverlay />);
    const kbds = container.querySelectorAll("kbd");
    expect(kbds.length).toBeGreaterThanOrEqual(12);
  });

  it("uses semantic dl/dt/dd markup", () => {
    setOverlayOpen(true);
    const { container } = render(() => <ShortcutOverlay />);
    expect(container.querySelector("dl")).not.toBeNull();
    expect(container.querySelectorAll("dt").length).toBeGreaterThanOrEqual(12);
    expect(container.querySelectorAll("dd").length).toBeGreaterThanOrEqual(12);
  });

  it("includes ? shortcut in the list", () => {
    setOverlayOpen(true);
    const { container } = render(() => <ShortcutOverlay />);
    const kbds = Array.from(container.querySelectorAll("kbd"));
    const keys = kbds.map((k) => k.textContent);
    expect(keys).toContain("?");
  });

  it("includes Escape shortcut in the list", () => {
    setOverlayOpen(true);
    const { container } = render(() => <ShortcutOverlay />);
    const kbds = Array.from(container.querySelectorAll("kbd"));
    const keys = kbds.map((k) => k.textContent);
    expect(keys).toContain("Escape");
  });

  it("does not set aria-hidden (this is a user feature)", () => {
    setOverlayOpen(true);
    const { container } = render(() => <ShortcutOverlay />);
    const dialog = container.querySelector("[role='dialog']");
    expect(dialog!.getAttribute("aria-hidden")).toBeNull();
  });

  it("has a close button with aria-label", () => {
    setOverlayOpen(true);
    const { container } = render(() => <ShortcutOverlay />);
    const close = container.querySelector(".shortcut-overlay-close");
    expect(close).not.toBeNull();
    expect(close!.getAttribute("aria-label")).toBe("Close");
  });

  it("dialog has tabindex=-1 for programmatic focus", () => {
    setOverlayOpen(true);
    const { container } = render(() => <ShortcutOverlay />);
    const dialog = container.querySelector("[role='dialog']");
    expect(dialog!.getAttribute("tabindex")).toBe("-1");
  });

  it("scrim element exists around dialog", () => {
    setOverlayOpen(true);
    const { container } = render(() => <ShortcutOverlay />);
    const scrim = container.querySelector(".shortcut-overlay-scrim");
    expect(scrim).not.toBeNull();
    const dialog = scrim!.querySelector("[role='dialog']");
    expect(dialog).not.toBeNull();
  });
});
