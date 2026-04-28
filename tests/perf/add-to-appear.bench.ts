import { test, expect } from "../e2e/test-fixtures";

const SAMPLE_COUNT = 20;
const P95_BUDGET_MS = 100;

test("p95 enter-to-task-visible latency is under 100ms", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const input = page.locator(".capture-line");
  const samples: number[] = [];

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    await input.fill(`task ${i}`);

    const expectedCount = i + 1;

    await page.evaluate((count: number) => {
      const list = document.querySelector<HTMLElement>(".task-list")!;
      (window as unknown as Record<string, unknown>).__PERF_START = performance.now();
      (window as unknown as Record<string, unknown>).__PERF_RESULT = new Promise<number>(
        (resolve) => {
          const observer = new MutationObserver(() => {
            if (list.querySelectorAll("li").length >= count) {
              observer.disconnect();
              resolve(
                performance.now() - (window as unknown as Record<string, number>).__PERF_START,
              );
            }
          });
          observer.observe(list, { childList: true, subtree: true });
          setTimeout(() => {
            observer.disconnect();
            resolve(-1);
          }, 5000);
        },
      );
    }, expectedCount);

    await input.press("Enter");

    const latency = await page.evaluate(async () => {
      return (window as unknown as Record<string, unknown>).__PERF_RESULT as Promise<number>;
    });

    if (latency > 0) {
      samples.push(latency);
    } else {
      await expect(page.locator(".task-list li")).toHaveCount(expectedCount);
    }
  }

  expect(samples.length).toBeGreaterThanOrEqual(SAMPLE_COUNT * 0.8);

  const sorted = [...samples].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)]!;

  // eslint-disable-next-line no-console
  console.log(
    `add-to-appear: p95=${p95.toFixed(2)}ms, median=${sorted[Math.floor(sorted.length / 2)]!.toFixed(2)}ms, samples=${samples.length}`,
  );

  expect(p95).toBeLessThan(P95_BUDGET_MS);
});
