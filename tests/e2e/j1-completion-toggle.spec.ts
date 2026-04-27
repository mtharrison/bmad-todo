import { test, expect } from "@playwright/test";

test.describe("Journey 1: Completion toggle", () => {
  test("click on row outside text toggles completion on and off", async ({
    page,
  }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    await captureInput.fill("Walk the dog");
    await page.keyboard.press("Enter");

    const row = page.locator("li").first();
    const checkbox = row.locator('input[type="checkbox"]');
    const box = (await row.boundingBox())!;
    const rowOutsideTextPosition = { x: box.width - 4, y: box.height / 2 };

    await row.click({ position: rowOutsideTextPosition });
    await expect(row).toHaveAttribute("data-completed", "true");
    await expect(checkbox).toHaveAttribute("aria-checked", "true");
    await expect(row.locator("svg")).toHaveCount(1);

    await row.click({ position: rowOutsideTextPosition });
    await expect(row).toHaveAttribute("data-completed", "false");
    await expect(checkbox).toHaveAttribute("aria-checked", "false");
    await expect(row.locator("svg")).toHaveCount(0);
  });

  test("keyboard x toggles, X toggles back", async ({ page }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    await captureInput.fill("Buy bread");
    await page.keyboard.press("Enter");

    const row = page.locator("li").first();
    await row.focus();

    await page.keyboard.press("x");
    await expect(row).toHaveAttribute("data-completed", "true");

    await page.keyboard.press("Shift+KeyX");
    await expect(row).toHaveAttribute("data-completed", "false");
  });

  test("no saving/loading/success indicator or dialog appears after toggle", async ({
    page,
  }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    await captureInput.fill("Test task");
    await page.keyboard.press("Enter");

    const row = page.locator("li").first();
    const checkbox = row.locator('input[type="checkbox"]');
    await checkbox.click();

    await expect(
      page.locator("text=/saving|loading|saved|done!|nice|great/i"),
    ).toHaveCount(0);
    await expect(
      page.locator("[role=alertdialog], [role=dialog]"),
    ).toHaveCount(0);
  });
});
