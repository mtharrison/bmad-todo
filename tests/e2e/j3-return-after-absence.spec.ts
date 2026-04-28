import { test, expect } from "./test-fixtures";

test.describe("Journey 3: Return after absence", () => {
  test("cached tasks render before any /tasks network request lands", async ({ page }) => {
    await page.goto("/");
    const captureInput = page.locator('input[aria-label="Add a task"]');
    const items = page.locator('ul[role="list"] li');

    for (const text of ["one", "two", "three"]) {
      await captureInput.fill(text);
      await page.keyboard.press("Enter");
    }
    await expect(items).toHaveCount(3);

    // On the next visit, throttle /tasks GET to 5s. The cached snapshot
    // should render BEFORE the network response arrives — no spinner.
    await page.route("**/tasks", async (route) => {
      if (route.request().method() === "GET") {
        await new Promise((r) => setTimeout(r, 5000));
      }
      await route.continue();
    });

    await page.reload();
    // Items should appear within a small window (<1s) — well before 5s.
    await expect(items).toHaveCount(3, { timeout: 1500 });
  });
});
