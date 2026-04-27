import { test, expect } from "@playwright/test";

test("web app loads with capture line focused", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.locator('input[aria-label="Add a task"]'),
  ).toBeFocused();
});

test("health endpoint returns 200", async ({ request }) => {
  const response = await request.get("/health");
  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);
});
