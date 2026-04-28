import { test, expect } from "./test-fixtures";

test.describe("Journey 5: Inline edit", () => {
  test("click text, change, press Enter commits the edit", async ({ page }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    await captureInput.fill("Buy oat milk");
    await page.keyboard.press("Enter");

    const row = page.locator("li").first();
    const textSpan = row.locator(".task-text");

    await textSpan.click();
    await expect(textSpan).toHaveAttribute("contenteditable", "plaintext-only");

    await textSpan.fill("");
    await textSpan.pressSequentially("Buy almond milk");
    await page.keyboard.press("Enter");

    await expect(textSpan).toHaveText("Buy almond milk");
    await expect(textSpan).not.toHaveAttribute("contenteditable");
  });

  test("click text, press Escape leaves text unchanged", async ({ page }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    await captureInput.fill("Walk the dog");
    await page.keyboard.press("Enter");

    const row = page.locator("li").first();
    const textSpan = row.locator(".task-text");

    await textSpan.click();
    await expect(textSpan).toHaveAttribute("contenteditable", "plaintext-only");

    await page.keyboard.press("Escape");

    await expect(textSpan).toHaveText("Walk the dog");
    await expect(textSpan).not.toHaveAttribute("contenteditable");
  });

  test("editing text to whitespace deletes the task", async ({ page }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    await captureInput.fill("Delete me");
    await page.keyboard.press("Enter");

    const row = page.locator("li").first();
    const textSpan = row.locator(".task-text");

    await textSpan.click();
    await textSpan.fill("");
    await textSpan.pressSequentially("   ");
    await page.keyboard.press("Enter");

    await expect(page.locator("li")).toHaveCount(0);
  });

  test("no dialogs, toasts, or save indicators after edit", async ({ page }) => {
    await page.goto("/");

    const captureInput = page.locator('input[aria-label="Add a task"]');
    await captureInput.fill("Edit me");
    await page.keyboard.press("Enter");

    const row = page.locator("li").first();
    const textSpan = row.locator(".task-text");

    await textSpan.click();
    await textSpan.fill("");
    await textSpan.pressSequentially("Edited text");
    await page.keyboard.press("Enter");

    await expect(page.locator("text=/saving|loading|saved|done!|nice|great/i")).toHaveCount(0);
    await expect(page.locator("[role=alertdialog], [role=dialog]")).toHaveCount(0);
  });
});
