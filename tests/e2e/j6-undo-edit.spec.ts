import { test, expect } from "./test-fixtures";

test.describe("Journey 6: Undo Edit", () => {
  test("undo restores original text after edit", async ({ page }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    await captureInput.fill("buy oat milk");
    await page.keyboard.press("Enter");

    await page.locator(".task-text").first().click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type("buy almond milk");
    await page.keyboard.press("Enter");

    await expect(page.locator(".task-text").first()).toHaveText("buy almond milk");

    const row = page.locator("li").first();
    await row.focus();
    await page.keyboard.press("u");

    await expect(page.locator(".task-text").first()).toHaveText("buy oat milk");
  });

  test("undo of whitespace-delete restores original text", async ({ page }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    await captureInput.fill("draft text");
    await page.keyboard.press("Enter");

    await page.locator(".task-text").first().click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type("   ");
    await page.keyboard.press("Enter");

    await expect(page.locator("li")).toHaveCount(0);

    await page.keyboard.press("u");
    await expect(page.locator("li")).toHaveCount(1);
    await expect(page.locator(".task-text").first()).toHaveText("draft text");
  });
});
