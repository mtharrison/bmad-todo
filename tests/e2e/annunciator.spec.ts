import { test, expect } from "./test-fixtures";

test.describe("Annunciator", () => {
  test("annunciator is hidden when online", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const annunciator = page.locator(".annunciator");
    await expect(annunciator).toHaveAttribute("data-state", "online");
    await expect(annunciator).not.toBeVisible();
  });

  test("annunciator appears after >2s offline and disappears on reconnect", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const annunciator = page.locator(".annunciator");

    await context.setOffline(true);
    // The annunciator-store has a 2s transient threshold
    await page.waitForTimeout(2500);
    // Trigger the browser's offline event manually since context.setOffline
    // may not fire the event in all browsers
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await page.waitForTimeout(2500);

    await expect(annunciator).toBeVisible({ timeout: 5000 });
    await expect(annunciator).toHaveAttribute("data-state", "offline");

    // Restore connectivity
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(annunciator).not.toBeVisible({ timeout: 5000 });
  });

  test("annunciator label is readable on focus", async ({ page, context }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await page.waitForTimeout(2500);

    const annunciator = page.locator(".annunciator");
    await expect(annunciator).toBeVisible({ timeout: 5000 });

    await annunciator.focus();
    const label = page.locator(".annunciator-label");
    await expect(label).toHaveText("Offline");
  });

  test("no success toast or banner appears after task operations", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    await captureInput.fill("test task");
    await page.keyboard.press("Enter");

    // Wait a moment for any potential toast/banner to appear
    await page.waitForTimeout(500);

    // Verify no toast, snackbar, modal, or dialog elements exist
    const forbidden = page.locator(
      '[role="alert"], [class*="toast"], [class*="snackbar"], [class*="modal"], [class*="dialog"]',
    );
    await expect(forbidden).toHaveCount(0);
  });

  test("annunciator dot uses accent color, not status colors", async ({ page, context }) => {
    await page.goto("/");
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await page.waitForTimeout(2500);

    const dot = page.locator(".annunciator-dot");
    await expect(dot).toBeVisible({ timeout: 5000 });

    const bgColor = await dot.evaluate((el) => getComputedStyle(el).backgroundColor);
    // Accent color in light theme is #9c3b1b (rgb(156, 59, 27))
    expect(bgColor).toBe("rgb(156, 59, 27)");
  });
});
