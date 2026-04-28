import { test, expect } from "./test-fixtures";

test.use({ viewport: { width: 375, height: 667 } });

test.describe("mobile tap-target routing (Story 1.8 AC#8)", () => {
  test("task row is at least 44×44px and tap routing splits text vs row", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.locator(".capture-line").fill("buy oats");
    await page.keyboard.press("Enter");

    const row = page.locator(".task-row").first();
    const box = await row.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);

    await row.locator(".task-text").click();
    await expect(row.locator('.task-text[contenteditable="plaintext-only"]')).toBeVisible();
    await page.keyboard.press("Escape");

    // Click in the row's right gutter — explicitly outside the .task-text bounding box —
    // to exercise the "tap outside text toggles complete" routing in TaskRow.handleRowClick.
    const taskTextBox = await row.locator(".task-text").boundingBox();
    expect(taskTextBox).not.toBeNull();
    const gutterX = box!.x + box!.width - 8;
    const insideY = box!.y + box!.height / 2;
    expect(gutterX).toBeGreaterThan(taskTextBox!.x + taskTextBox!.width);
    await page.mouse.click(gutterX, insideY);
    await expect(row).toHaveAttribute("data-completed", "true");
  });
});
