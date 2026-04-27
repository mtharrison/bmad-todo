import { test, expect } from "@playwright/test";

test.describe("Journey 1: Capture work review", () => {
  test("adds tasks in newest-first order", async ({ page }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    const taskList = page.locator('ul[role="list"]');

    await captureInput.fill("Buy oat milk");
    await page.keyboard.press("Enter");

    const items1 = taskList.locator("li");
    await expect(items1).toHaveCount(1);
    await expect(items1.first()).toHaveText("Buy oat milk");
    await expect(captureInput).toHaveValue("");
    await expect(captureInput).toBeFocused();

    await captureInput.fill("Walk the dog");
    await page.keyboard.press("Enter");

    const items2 = taskList.locator("li");
    await expect(items2).toHaveCount(2);
    await expect(items2.nth(0)).toHaveText("Walk the dog");
    await expect(items2.nth(1)).toHaveText("Buy oat milk");
  });

  test("no spinner, skeleton, or loading indicator appears", async ({
    page,
  }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    await captureInput.fill("Test task");
    await page.keyboard.press("Enter");

    const loadingIndicators = page.locator("text=/saving|loading|saved/i");
    await expect(loadingIndicators).toHaveCount(0);
  });

  test("Escape clears the input without creating a task", async ({ page }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    const taskList = page.locator('ul[role="list"]');

    await captureInput.fill("drafttext");
    await page.keyboard.press("Escape");

    await expect(captureInput).toHaveValue("");
    const items = taskList.locator("li");
    await expect(items).toHaveCount(0);
  });

  test("whitespace-only Enter is a no-op", async ({ page }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    const taskList = page.locator('ul[role="list"]');

    await captureInput.fill("   ");
    await page.keyboard.press("Enter");

    const items = taskList.locator("li");
    await expect(items).toHaveCount(0);
    await expect(captureInput).toHaveValue("   ");
  });
});
