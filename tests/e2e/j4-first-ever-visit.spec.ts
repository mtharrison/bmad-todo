import { test, expect } from "./test-fixtures";

test.describe("Journey 4: First ever visit", () => {
  test("shows focused capture line with empty list and no decorative content", async ({ page }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    await expect(captureInput).toBeFocused();

    const taskList = page.locator('ul[role="list"]');
    await expect(taskList).toBeVisible();
    const items = taskList.locator("li");
    await expect(items).toHaveCount(0);

    const decorativeElements = page.locator("img, svg, picture, canvas");
    await expect(decorativeElements).toHaveCount(0);

    const welcomeText = page.locator("text=/welcome|get started|tip/i");
    await expect(welcomeText).toHaveCount(0);
  });
});
