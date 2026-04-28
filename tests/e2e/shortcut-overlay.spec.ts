import { test, expect } from "./test-fixtures";

test.describe("Keyboard Shortcut Overlay (Story 1.14)", () => {
  test("? key opens overlay showing all shortcuts", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[aria-label="Add a task"]');
    await input.blur();

    await page.keyboard.press("?");

    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");

    const heading = page.locator("#shortcut-overlay-heading");
    await expect(heading).toHaveText("Keyboard Shortcuts");

    const kbds = dialog.locator("kbd");
    await expect(kbds).not.toHaveCount(0);
  });

  test("Escape closes overlay and restores focus", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.type("task one");
    await page.keyboard.press("Enter");

    await page.keyboard.press("Tab");
    const row = page.locator("li").first();
    await expect(row).toBeFocused();

    await page.keyboard.press("?");
    await expect(page.locator("[role='dialog']")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator("[role='dialog']")).not.toBeVisible();
    await expect(row).toBeFocused();
  });

  test("? again closes overlay", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[aria-label="Add a task"]');
    await input.blur();

    await page.keyboard.press("?");
    await expect(page.locator("[role='dialog']")).toBeVisible();

    await page.keyboard.press("?");
    await expect(page.locator("[role='dialog']")).not.toBeVisible();
  });

  test("? does NOT open overlay when typing in capture line", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[aria-label="Add a task"]');
    await expect(input).toBeFocused();

    await page.keyboard.type("?");
    await expect(page.locator("[role='dialog']")).not.toBeVisible();
    await expect(input).toHaveValue("?");
  });

  test("other shortcut keys are suppressed while overlay is open", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.type("test task");
    await page.keyboard.press("Enter");

    const input = page.locator('input[aria-label="Add a task"]');
    await input.blur();

    await page.keyboard.press("?");
    await expect(page.locator("[role='dialog']")).toBeVisible();

    await page.keyboard.press("t");
    await page.keyboard.press("j");
    await page.keyboard.press("x");

    await page.keyboard.press("Escape");
    await expect(page.locator("[role='dialog']")).not.toBeVisible();

    const task = page.locator("li").first();
    await expect(task).not.toHaveAttribute("data-completed", "true");
  });

  test("clicking scrim closes overlay and restores focus", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.type("task one");
    await page.keyboard.press("Enter");

    await page.keyboard.press("Tab");
    const row = page.locator("li").first();
    await expect(row).toBeFocused();

    await page.keyboard.press("?");
    await expect(page.locator("[role='dialog']")).toBeVisible();

    const scrim = page.locator(".shortcut-overlay-scrim");
    await scrim.click({ position: { x: 10, y: 10 } });
    await expect(page.locator("[role='dialog']")).not.toBeVisible();
    await expect(row).toBeFocused();
  });

  test("overlay never auto-opens on page load", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[role='dialog']")).not.toBeVisible();
  });

  test("overlay has semantic dl/dt/dd markup", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[aria-label="Add a task"]');
    await input.blur();

    await page.keyboard.press("?");
    const dialog = page.locator("[role='dialog']");
    await expect(dialog.locator("dl")).toHaveCount(1);
    const dtCount = await dialog.locator("dt").count();
    expect(dtCount).toBeGreaterThanOrEqual(12);
  });

  test("clicking dialog content does NOT close overlay", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[aria-label="Add a task"]');
    await input.blur();

    await page.keyboard.press("?");
    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible();

    await dialog.click();
    await expect(dialog).toBeVisible();
  });
});
