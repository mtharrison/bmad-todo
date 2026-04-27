import { test, expect } from "@playwright/test";

test.describe("Journey 2: Delete (undo deferred to Story 1.6)", () => {
  test("pressing D on focused task row removes it from the list", async ({
    page,
  }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    await captureInput.fill("Buy bread");
    await page.keyboard.press("Enter");

    const row = page.locator("li").first();
    await row.focus();

    await page.keyboard.press("d");
    await expect(page.locator("li")).toHaveCount(0);
  });

  test("no confirmation dialog appears on delete", async ({ page }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    await captureInput.fill("Delete me");
    await page.keyboard.press("Enter");

    const row = page.locator("li").first();
    await row.focus();

    await page.keyboard.press("d");

    await expect(
      page.locator("[role=alertdialog], [role=dialog]"),
    ).toHaveCount(0);
    await expect(page.locator("text=/are you sure|confirm/i")).toHaveCount(0);
  });
});
