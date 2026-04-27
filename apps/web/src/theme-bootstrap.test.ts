import { describe, it, expect, beforeEach, vi } from "vitest";
import { resolveTheme, applyTheme } from "./theme-bootstrap";

describe("theme-bootstrap", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  describe("resolveTheme", () => {
    it("defaults to light when OS prefers light", () => {
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: false,
      } as MediaQueryList);

      expect(resolveTheme()).toBe("light");
    });

    it("defaults to dark when OS prefers dark", () => {
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: true,
      } as MediaQueryList);

      expect(resolveTheme()).toBe("dark");
    });

    it("localStorage override wins over OS preference", () => {
      localStorage.setItem("theme", "light");
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: true,
      } as MediaQueryList);

      expect(resolveTheme()).toBe("light");
    });

    it("localStorage dark override wins over OS light preference", () => {
      localStorage.setItem("theme", "dark");
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: false,
      } as MediaQueryList);

      expect(resolveTheme()).toBe("dark");
    });

    it("ignores invalid localStorage values", () => {
      localStorage.setItem("theme", "invalid");
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: false,
      } as MediaQueryList);

      expect(resolveTheme()).toBe("light");
    });
  });

  describe("applyTheme", () => {
    it("sets data-theme=light on html element", () => {
      applyTheme("light");
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });

    it("sets data-theme=dark on html element", () => {
      applyTheme("dark");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });
  });
});
