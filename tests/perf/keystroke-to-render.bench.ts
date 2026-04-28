import { test, expect } from "../e2e/test-fixtures";

const SAMPLE_COUNT = 50;
const P95_BUDGET_MS = 16;

test("p95 keystroke-to-render latency is under 16ms", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const input = page.locator(".capture-line");
  await input.focus();

  const samples = await page.evaluate(async (count: number) => {
    const el = document.querySelector<HTMLInputElement>(".capture-line")!;
    const results: number[] = [];

    for (let i = 0; i < count; i++) {
      const start = performance.now();
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
      el.value += "a";
      el.dispatchEvent(new InputEvent("input", { bubbles: true, data: "a" }));

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          results.push(performance.now() - start);
          resolve();
        });
      });
    }

    return results;
  }, SAMPLE_COUNT);

  expect(samples.length).toBe(SAMPLE_COUNT);

  const sorted = [...samples].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)]!;

  // eslint-disable-next-line no-console
  console.log(
    `keystroke-to-render: p95=${p95.toFixed(2)}ms, median=${sorted[Math.floor(sorted.length / 2)]!.toFixed(2)}ms, samples=${samples.length}`,
  );

  expect(p95).toBeLessThan(P95_BUDGET_MS);
});
