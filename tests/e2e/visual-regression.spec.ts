import { test, expect } from "@playwright/test";

test.describe("visual regression - blank screen", () => {
  test("light theme snapshot", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme", "light");
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page).toHaveScreenshot("blank-light.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("dark theme snapshot", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page).toHaveScreenshot("blank-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("empty state contains only page background and minimal content", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const body = page.locator("body");
    const children = body.locator(":scope > *");
    const childCount = await children.count();

    expect(childCount).toBeLessThanOrEqual(2);

    const images = page.locator("img, svg, picture, canvas");
    const imageCount = await images.count();
    expect(imageCount).toBe(0);
  });
});
