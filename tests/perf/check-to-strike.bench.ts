import { test, expect } from "../e2e/test-fixtures";

const SAMPLE_COUNT = 10;
const P95_BUDGET_MS = 50;

test("p95 completion-to-strikethrough latency is under 50ms", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const input = page.locator(".capture-line");
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    await input.fill(`task ${i}`);
    await input.press("Enter");
  }

  await expect(page.locator(".task-list li")).toHaveCount(SAMPLE_COUNT);

  const samples: number[] = [];

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const row = page.locator(".task-list li").nth(i);
    await expect(row).toHaveAttribute("data-completed", "false");
    await row.focus();
    await page.waitForTimeout(50);

    await page.evaluate((index: number) => {
      const rows = document.querySelectorAll<HTMLElement>(".task-list li");
      const target = rows[index]!;
      (window as unknown as Record<string, unknown>).__PERF_START = performance.now();
      (window as unknown as Record<string, unknown>).__PERF_RESULT = new Promise<number>(
        (resolve) => {
          const observer = new MutationObserver(() => {
            if (target.getAttribute("data-completed") === "true") {
              observer.disconnect();
              resolve(
                performance.now() - (window as unknown as Record<string, number>).__PERF_START,
              );
            }
          });
          observer.observe(target, { attributes: true, attributeFilter: ["data-completed"] });
          setTimeout(() => {
            observer.disconnect();
            resolve(-1);
          }, 5000);
        },
      );
    }, i);

    await page.keyboard.press("x");

    const latency = await page.evaluate(async () => {
      return (window as unknown as Record<string, unknown>).__PERF_RESULT as Promise<number>;
    });

    expect(latency).toBeGreaterThan(0);
    samples.push(latency);
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)]!;

  // eslint-disable-next-line no-console
  console.log(
    `check-to-strike: p95=${p95.toFixed(2)}ms, median=${sorted[Math.floor(sorted.length / 2)]!.toFixed(2)}ms, samples=${samples.length}`,
  );

  expect(p95).toBeLessThan(P95_BUDGET_MS);
});
