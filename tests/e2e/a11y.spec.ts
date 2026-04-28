import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./test-fixtures";

const THEMES = ["light", "dark"] as const;

function axeScan(page: import("@playwright/test").Page) {
  return new AxeBuilder({ page }).withTags(["wcag2a", "wcag21a", "wcag2aa", "wcag21aa"]).analyze();
}

for (const theme of THEMES) {
  test.describe(`axe-core audit — ${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t: string) => {
        localStorage.setItem("theme", t);
      }, theme);
    });

    test("empty state has zero a11y violations", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const results = await axeScan(page);
      expect(results.violations).toEqual([]);
    });

    test("populated state has zero a11y violations", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const input = page.locator(".capture-line");
      for (const text of ["Buy milk", "Walk dog", "Read book"]) {
        await input.fill(text);
        await input.press("Enter");
      }
      await expect(page.locator(".task-list li")).toHaveCount(3);
      const results = await axeScan(page);
      expect(results.violations).toEqual([]);
    });

    test("completed task state has zero a11y violations", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const input = page.locator(".capture-line");
      await input.fill("Complete me");
      await input.press("Enter");
      await expect(page.locator(".task-list li")).toHaveCount(1);
      const row = page.locator(".task-list li").first();
      await row.focus();
      await page.keyboard.press("x");
      await expect(row).toHaveAttribute("data-completed", "true");
      const results = await axeScan(page);
      expect(results.violations).toEqual([]);
    });

    test("focused task state has zero a11y violations", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const input = page.locator(".capture-line");
      await input.fill("Focus me");
      await input.press("Enter");
      await expect(page.locator(".task-list li")).toHaveCount(1);
      await page.keyboard.press("Tab");
      const results = await axeScan(page);
      expect(results.violations).toEqual([]);
    });

    test("edit mode state has zero a11y violations", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const input = page.locator(".capture-line");
      await input.fill("Edit me");
      await input.press("Enter");
      await expect(page.locator(".task-list li")).toHaveCount(1);
      const row = page.locator(".task-list li").first();
      await row.focus();
      await page.keyboard.press("e");
      await expect(page.locator('.task-text[contenteditable="plaintext-only"]')).toBeVisible();
      const results = await axeScan(page);
      expect(results.violations).toEqual([]);
    });

    test("annunciator visible state has zero a11y violations", async ({ page, context }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await context.setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event("offline")));
      await page.waitForTimeout(2500);
      await expect(page.locator(".annunciator")).toBeVisible({ timeout: 5000 });
      const results = await axeScan(page);
      expect(results.violations).toEqual([]);
    });
  });
}
