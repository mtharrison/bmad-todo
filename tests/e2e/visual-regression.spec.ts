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

  test("empty state contains only capture line and empty list", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const rootChildren = page.locator("#root > *");
    const rootChildCount = await rootChildren.count();
    expect(rootChildCount).toBeLessThanOrEqual(1);

    const images = page.locator("img, svg, picture, canvas");
    const imageCount = await images.count();
    expect(imageCount).toBe(0);
  });
});
