import { test, expect } from "./test-fixtures";

const THEMES = ["light", "dark"] as const;
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
} as const;

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

test.describe("visual regression - mobile viewport", () => {
  for (const theme of THEMES) {
    test(`empty state — ${theme} theme (mobile)`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.addInitScript((t: string) => {
        localStorage.setItem("theme", t);
      }, theme);
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot(`empty-mobile-${theme}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});

test.describe("visual regression - tablet viewport", () => {
  for (const theme of THEMES) {
    test(`empty state — ${theme} theme (tablet)`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.tablet);
      await page.addInitScript((t: string) => {
        localStorage.setItem("theme", t);
      }, theme);
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot(`empty-tablet-${theme}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});

test.describe("visual regression - populated state", () => {
  async function addTasks(page: import("@playwright/test").Page) {
    const input = page.locator(".capture-line");
    for (const text of ["Buy groceries", "Walk the dog", "Read a book"]) {
      await input.fill(text);
      await input.press("Enter");
    }
    await expect(page.locator(".task-list li")).toHaveCount(3);
  }

  for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
    for (const theme of THEMES) {
      test(`populated — ${theme} theme (${vpName})`, async ({ page }) => {
        await page.setViewportSize(vpSize);
        await page.addInitScript((t: string) => {
          localStorage.setItem("theme", t);
        }, theme);
        await page.goto("/");
        await page.waitForLoadState("networkidle");
        await addTasks(page);
        await expect(page).toHaveScreenshot(`populated-${vpName}-${theme}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0.01,
        });
      });
    }
  }
});

test.describe("visual regression - focused state", () => {
  for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
    for (const theme of THEMES) {
      test(`focused row — ${theme} theme (${vpName})`, async ({ page }) => {
        await page.setViewportSize(vpSize);
        await page.addInitScript((t: string) => {
          localStorage.setItem("theme", t);
        }, theme);
        await page.goto("/");
        await page.waitForLoadState("networkidle");
        const input = page.locator(".capture-line");
        for (const text of ["Task A", "Task B", "Task C"]) {
          await input.fill(text);
          await input.press("Enter");
        }
        await expect(page.locator(".task-list li")).toHaveCount(3);
        await page.keyboard.press("Tab");
        await expect(page).toHaveScreenshot(`focused-${vpName}-${theme}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0.01,
        });
      });
    }
  }
});

test.describe("visual regression - completed state", () => {
  for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
    for (const theme of THEMES) {
      test(`completed task — ${theme} theme (${vpName})`, async ({ page }) => {
        await page.setViewportSize(vpSize);
        await page.addInitScript((t: string) => {
          localStorage.setItem("theme", t);
        }, theme);
        await page.goto("/");
        await page.waitForLoadState("networkidle");
        const input = page.locator(".capture-line");
        for (const text of ["Done item", "Active item A", "Active item B"]) {
          await input.fill(text);
          await input.press("Enter");
        }
        await expect(page.locator(".task-list li")).toHaveCount(3);
        const firstRow = page.locator(".task-list li").first();
        await firstRow.focus();
        await page.keyboard.press("x");
        await expect(firstRow).toHaveAttribute("data-completed", "true");
        await expect(page).toHaveScreenshot(`completed-${vpName}-${theme}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0.01,
        });
      });
    }
  }
});

test.describe("visual regression - edit mode", () => {
  for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
    for (const theme of THEMES) {
      test(`edit mode — ${theme} theme (${vpName})`, async ({ page }) => {
        await page.setViewportSize(vpSize);
        await page.addInitScript((t: string) => {
          localStorage.setItem("theme", t);
        }, theme);
        await page.goto("/");
        await page.waitForLoadState("networkidle");
        const input = page.locator(".capture-line");
        await input.fill("Edit this task");
        await input.press("Enter");
        await expect(page.locator(".task-list li")).toHaveCount(1);
        const row = page.locator(".task-list li").first();
        await row.focus();
        await page.keyboard.press("e");
        await expect(page.locator('.task-text[contenteditable="plaintext-only"]')).toBeVisible();
        await expect(page).toHaveScreenshot(`edit-${vpName}-${theme}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0.01,
        });
      });
    }
  }
});

test.describe("visual regression - annunciator state (all viewports)", () => {
  for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
    for (const theme of THEMES) {
      test(`annunciator — ${theme} theme (${vpName})`, async ({ page, context }) => {
        await page.setViewportSize(vpSize);
        await page.addInitScript((t: string) => {
          localStorage.setItem("theme", t);
        }, theme);
        await page.goto("/");
        await page.waitForLoadState("networkidle");
        await context.setOffline(true);
        await page.evaluate(() => window.dispatchEvent(new Event("offline")));
        await page.waitForTimeout(2500);
        await expect(page.locator(".annunciator")).toBeVisible({ timeout: 5000 });
        await expect(page).toHaveScreenshot(`annunciator-${vpName}-${theme}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0.01,
        });
      });
    }
  }
});
