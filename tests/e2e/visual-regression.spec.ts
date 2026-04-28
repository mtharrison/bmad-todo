import { test, expect } from "./test-fixtures";

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

  test("light theme high-contrast snapshot", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme", "light");
    });
    await page.emulateMedia({ contrast: "more", colorScheme: "light" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page).toHaveScreenshot("blank-light-high-contrast.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("dark theme high-contrast snapshot", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.emulateMedia({ contrast: "more", colorScheme: "dark" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page).toHaveScreenshot("blank-dark-high-contrast.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("forced-colors active snapshot", async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("blank-forced-colors.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("annunciator-surfaced light theme snapshot", async ({ page, context }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme", "light");
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await page.waitForTimeout(2500);
    await expect(page.locator(".annunciator")).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveScreenshot("annunciator-surfaced-light.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("annunciator-surfaced dark theme snapshot", async ({ page, context }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await page.waitForTimeout(2500);
    await expect(page.locator(".annunciator")).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveScreenshot("annunciator-surfaced-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("empty state contains only capture line and empty list", async ({ page }) => {
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
