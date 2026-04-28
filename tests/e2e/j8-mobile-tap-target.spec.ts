import { test, expect } from "@playwright/test";

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

    const outsideX = box!.x + box!.width - 8;
    const insideY = box!.y + box!.height / 2;
    await page.mouse.click(outsideX, insideY);
    await expect(row).toHaveAttribute("data-completed", "true");
  });
});
