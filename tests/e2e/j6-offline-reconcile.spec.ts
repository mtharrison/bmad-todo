import { test, expect } from "./test-fixtures";

test.describe("Journey 6: Offline write + reconcile", () => {
  test("queues offline mutations and replays on reconnect", async ({ page, context, request }) => {
    await page.goto("/");
    const captureInput = page.locator('input[aria-label="Add a task"]');
    const items = page.locator('ul[role="list"] li');

    // Online: add a task
    await captureInput.fill("first online task");
    await page.keyboard.press("Enter");
    await expect(items).toHaveCount(1);

    // Go offline; add another task — appears immediately (optimistic).
    await context.setOffline(true);
    await captureInput.fill("offline task");
    await page.keyboard.press("Enter");
    await expect(items).toHaveCount(2);

    // While offline, the optimistic task is rendered from in-memory state.
    // (Full reload-while-offline coverage requires the production SW shell
    // cache, which is exercised by Story 1.13's deployment harness.)

    // Reconnect; outbox drains and the server now has both.
    await context.setOffline(false);
    await expect
      .poll(
        async () => {
          const res = await request.get("/tasks");
          const body = (await res.json()) as Array<unknown>;
          return body.length;
        },
        { timeout: 15_000 },
      )
      .toBe(2);
  });
});
