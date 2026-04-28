import { describe, it, expect, beforeEach, vi } from "vitest";

describe("theme-store", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
    } as MediaQueryList);
    vi.resetModules();
  });

  it("initializes light when no localStorage and OS prefers light", async () => {
    const { theme } = await import("./theme-store");
    expect(theme()).toBe("light");
  });

  it("initializes dark when localStorage.theme is dark", async () => {
    localStorage.setItem("theme", "dark");
    const { theme } = await import("./theme-store");
    expect(theme()).toBe("dark");
  });

  it("initializes dark when OS prefers dark and no localStorage override", async () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
    } as MediaQueryList);
    const { theme } = await import("./theme-store");
    expect(theme()).toBe("dark");
  });

  it("setTheme updates the signal, the DOM, and localStorage", async () => {
    const { theme, setTheme } = await import("./theme-store");
    setTheme("dark");
    expect(theme()).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("setTheme survives localStorage.setItem throwing", async () => {
    const { theme, setTheme } = await import("./theme-store");
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => setTheme("dark")).not.toThrow();
    expect(theme()).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    setItemSpy.mockRestore();
  });

  it("toggleTheme flips light → dark → light, writing to DOM and localStorage", async () => {
    const { theme, toggleTheme } = await import("./theme-store");
    expect(theme()).toBe("light");
    toggleTheme();
    expect(theme()).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    toggleTheme();
    expect(theme()).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("toggleTheme does NOT call .focus() on any element (AC#9)", async () => {
    const { toggleTheme } = await import("./theme-store");
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    expect(document.activeElement).toBe(input);
    toggleTheme();
    expect(document.activeElement).toBe(input);
    document.body.removeChild(input);
  });
});
