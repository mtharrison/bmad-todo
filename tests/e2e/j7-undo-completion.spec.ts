import { test, expect } from "./test-fixtures";

test.describe("Journey 7: Undo Completion", () => {
  test("undo of complete restores active state", async ({ page }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    await captureInput.fill("wash dishes");
    await page.keyboard.press("Enter");

    const row = page.locator("li").first();
    await row.focus();
    await page.keyboard.press("x");

    await expect(row).toHaveAttribute("data-completed", "true");
    await expect(row.locator("svg")).toHaveCount(1);

    await page.keyboard.press("u");
    await expect(row).toHaveAttribute("data-completed", "false");
    await expect(row.locator("svg")).toHaveCount(0);
  });

  test("undo of uncomplete restores completed state", async ({ page }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    await captureInput.fill("vacuum");
    await page.keyboard.press("Enter");

    const row = page.locator("li").first();
    await row.focus();

    await page.keyboard.press("x");
    await expect(row).toHaveAttribute("data-completed", "true");

    await page.keyboard.press("x");
    await expect(row).toHaveAttribute("data-completed", "false");

    await page.keyboard.press("u");
    await expect(row).toHaveAttribute("data-completed", "true");
  });
});
