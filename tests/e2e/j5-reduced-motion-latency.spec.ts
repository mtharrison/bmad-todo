import { test, expect } from "./test-fixtures";

// Story 1.8 AC#5 — prefers-reduced-motion: reduce must collapse all transitions
// involved in the strike-through commit so the keystroke-to-render path stays
// within NFR-Perf-1 (<16ms). The CSS path resolves --motion-default to 0ms via
// the @media (prefers-reduced-motion: reduce) override; this spec is the
// regression-coverage the AC mandates.

test.describe("AC#5 — prefers-reduced-motion latency budget", () => {
  test("strike-through commit settles within frame budget under reduced-motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "none" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const motionDefault = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--motion-default")
        .trim(),
    );
    expect(motionDefault).toBe("0ms");

    const transitions = await page.evaluate(() => {
      const selectors = [".task-row", ".task-text", ".task-checkbox", ".task-tick"];
      return selectors.flatMap((selector) => {
        const el = document.querySelector(selector);
        if (!el) return [];
        return getComputedStyle(el)
          .transitionDuration.split(",")
          .map((duration) => ({ selector, duration: duration.trim() }));
      });
    });
    for (const t of transitions) {
      expect(
        t.duration,
        `${t.selector} declares non-zero transition under reduced-motion`,
      ).toBe("0s");
    }

    await page.locator(".capture-line").fill("settle me");
    await page.keyboard.press("Enter");

    const result = await page.evaluate(() => {
      const li = document.querySelector<HTMLElement>(".task-row");
      if (!li) throw new Error("expected a .task-row to exist");
      li.focus();
      const start = performance.now();
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "x", bubbles: true }),
      );
      const elapsed = performance.now() - start;
      return { elapsed, completed: li.getAttribute("data-completed") };
    });

    expect(result.completed).toBe("true");
    expect(result.elapsed).toBeLessThan(16);
  });
});
