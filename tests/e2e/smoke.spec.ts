import { test, expect } from "@playwright/test";

test("web app loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("bmad-todo");
});

test("health endpoint returns 200", async ({ request }) => {
  const response = await request.get("/health");
  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);
});
