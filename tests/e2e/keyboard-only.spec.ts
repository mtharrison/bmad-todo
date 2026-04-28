// NFR-A11y-3: this spec must use keyboard-only interactions.
// Do not introduce page.click(), page.tap(), page.hover(), page.mouse.*, or page.touchscreen.*.
// Failure of any flow without a pointer fails the build (Story 1.7 AC#11).

import { test, expect } from "./test-fixtures";

test.describe("Keyboard-only journeys (NFR-A11y-3)", () => {
  test("J1 — add three tasks via keyboard alone", async ({ page }) => {
    await page.goto("/");
    // CaptureLine auto-focuses on desktop; type immediately.
    await page.keyboard.type("Buy oat milk");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Walk the dog");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Read for 30 minutes");
    await page.keyboard.press("Enter");

    const items = page.locator("li");
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toHaveText("Read for 30 minutes");
    await expect(items.nth(2)).toHaveText("Buy oat milk");
  });

  test("J2 — delete and undo via Tab, d, u alone", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.type("Buy bread");
    await page.keyboard.press("Enter");

    // Tab from the capture input lands on the first row (its tabindex=0 default).
    await page.keyboard.press("Tab");
    await page.keyboard.press("d");
    await expect(page.locator("li")).toHaveCount(0);

    await page.keyboard.press("u");
    await expect(page.locator("li")).toHaveCount(1);
    await expect(page.locator(".task-text").first()).toHaveText("Buy bread");
  });

  test("J5 — edit task text via Tab, e, Enter alone", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.type("Buy oat milk");
    await page.keyboard.press("Enter");

    await page.keyboard.press("Tab");
    await page.keyboard.press("e");
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("Buy almond milk");
    await page.keyboard.press("Enter");

    await expect(page.locator(".task-text").first()).toHaveText("Buy almond milk");
  });

  test("n returns focus to capture line from a row", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.type("task one");
    await page.keyboard.press("Enter");

    await page.keyboard.press("Tab");
    await expect(page.locator("li").first()).toBeFocused();

    await page.keyboard.press("n");
    await expect(page.locator('input[aria-label="Add a task"]')).toBeFocused();
  });

  test("Cmd+Enter from a row returns focus to capture line", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.type("task one");
    await page.keyboard.press("Enter");

    await page.keyboard.press("Tab");
    await expect(page.locator("li").first()).toBeFocused();

    await page.keyboard.press("ControlOrMeta+Enter");
    await expect(page.locator('input[aria-label="Add a task"]')).toBeFocused();
  });

  test("typing j/k/x/u in capture line types letters, does not navigate", async ({ page }) => {
    await page.goto("/");
    // Add a task first so a focusable row exists; if stickiness leaks, it would receive focus.
    await page.keyboard.type("seed task");
    await page.keyboard.press("Enter");

    await page.keyboard.type("jkxu");
    await expect(page.locator('input[aria-label="Add a task"]')).toHaveValue("jkxu");
    // No row should have data-focused="true" while CaptureLine retained DOM focus (AC#5).
    await expect(page.locator('li[data-focused="true"]')).toHaveCount(0);
  });

  test("j/k navigation moves the focus ring between rows", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.type("first");
    await page.keyboard.press("Enter");
    await page.keyboard.type("second");
    await page.keyboard.press("Enter");
    await page.keyboard.type("third");
    await page.keyboard.press("Enter");

    // Tab into the list (lands on row 0 = "third", newest-first).
    await page.keyboard.press("Tab");
    await expect(page.locator("li").nth(0)).toBeFocused();

    await page.keyboard.press("j");
    await expect(page.locator("li").nth(1)).toBeFocused();

    await page.keyboard.press("j");
    await expect(page.locator("li").nth(2)).toBeFocused();

    // No wrap at end.
    await page.keyboard.press("j");
    await expect(page.locator("li").nth(2)).toBeFocused();

    await page.keyboard.press("k");
    await expect(page.locator("li").nth(1)).toBeFocused();
  });

  test("x toggles completion on the focused row via keyboard alone", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.type("toggle me");
    await page.keyboard.press("Enter");

    await page.keyboard.press("Tab");
    await page.keyboard.press("x");

    await expect(page.locator("li").first()).toHaveAttribute("data-completed", "true");
  });
});
