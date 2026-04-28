import { test, expect } from "../e2e/test-fixtures";

const SAMPLE_COUNT = 50;
const P95_BUDGET_MS = 16;

test("p95 keystroke-to-render latency is under 16ms", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const input = page.locator(".capture-line");
  await input.focus();

  const samples: number[] = [];

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    await page.evaluate(() => {
      const el = document.querySelector<HTMLInputElement>(".capture-line")!;
      (window as unknown as Record<string, unknown>).__PERF_KS_RESULT = new Promise<number>(
        (resolve) => {
          el.addEventListener("input", function handler() {
            el.removeEventListener("input", handler);
            const start = performance.now();
            requestAnimationFrame(() => {
              resolve(performance.now() - start);
            });
          });
        },
      );
    });

    await page.keyboard.press("a");

    const latency = await page.evaluate(async () => {
      return (window as unknown as Record<string, unknown>).__PERF_KS_RESULT as Promise<number>;
    });

    samples.push(latency);
  }

  expect(samples.length).toBe(SAMPLE_COUNT);

  const sorted = [...samples].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)]!;

  // eslint-disable-next-line no-console
  console.log(
    `keystroke-to-render: p95=${p95.toFixed(2)}ms, median=${sorted[Math.floor(sorted.length / 2)]!.toFixed(2)}ms, samples=${samples.length}`,
  );

  expect(p95).toBeLessThan(P95_BUDGET_MS);
});
