import { test, expect } from "@playwright/test";

test.describe("Journey 2: Delete + Undo", () => {
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

  test("undo restores deleted task", async ({ page }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    await captureInput.fill("Buy bread");
    await page.keyboard.press("Enter");

    const row = page.locator("li").first();
    await row.focus();

    await page.keyboard.press("d");
    await expect(page.locator("li")).toHaveCount(0);

    await page.keyboard.press("Tab");
    await page.keyboard.press("u");
    await expect(page.locator("li")).toHaveCount(1);
    await expect(page.locator(".task-text").first()).toHaveText("Buy bread");
  });

  test("undo with empty stack is a no-op", async ({ page }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    await captureInput.click();
    await page.keyboard.press("Tab");
    await page.keyboard.press("u");

    await expect(page.locator("li")).toHaveCount(0);
  });

  test("LIFO multi-undo restores tasks in reverse order", async ({ page }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    await captureInput.fill("A");
    await page.keyboard.press("Enter");
    await captureInput.fill("B");
    await page.keyboard.press("Enter");
    await captureInput.fill("C");
    await page.keyboard.press("Enter");

    const firstRow = page.locator("li").first();
    await firstRow.focus();
    await page.keyboard.press("d");

    const nextFirst = page.locator("li").first();
    await nextFirst.focus();
    await page.keyboard.press("d");

    await expect(page.locator("li")).toHaveCount(1);

    await page.keyboard.press("u");
    await expect(page.locator("li")).toHaveCount(2);
    await expect(page.locator(".task-text").first()).toHaveText("B");

    await page.keyboard.press("u");
    await expect(page.locator("li")).toHaveCount(3);
    await expect(page.locator(".task-text").first()).toHaveText("C");
  });
});
