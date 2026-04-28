import { test, expect } from "../e2e/test-fixtures";
import { randomUUID } from "node:crypto";

const TASK_COUNT = 100;
const BUDGET_MS = 100;

test("cold-load with 100 tasks paints within 100ms", async ({ page, request }) => {
  for (let i = 0; i < TASK_COUNT; i++) {
    await request.post("/tasks", {
      data: {
        id: randomUUID(),
        text: `seeded task ${i}`,
        createdAt: Date.now() - i * 1000,
      },
      headers: { "Idempotency-Key": randomUUID() },
    });
  }

  const res = await request.get("/tasks");
  const tasks = (await res.json()) as unknown[];
  expect(tasks.length).toBe(TASK_COUNT);

  await page.addInitScript((count: number) => {
    (window as unknown as Record<string, unknown>).__COLD_LOAD_RESULT = new Promise<number>(
      (resolve) => {
        const start = performance.now();
        const check = () => {
          const items = document.querySelectorAll(".task-list li");
          if (items.length >= count) {
            resolve(performance.now() - start);
          } else {
            requestAnimationFrame(check);
          }
        };
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", () => requestAnimationFrame(check));
        } else {
          requestAnimationFrame(check);
        }
      },
    );
  }, TASK_COUNT);

  await page.goto("/");

  const paintTime = await page.evaluate(async () => {
    return (window as unknown as Record<string, unknown>).__COLD_LOAD_RESULT as Promise<number>;
  });

  // eslint-disable-next-line no-console
  console.log(`cold-load-paint: ${paintTime.toFixed(2)}ms for ${TASK_COUNT} tasks`);

  expect(paintTime).toBeLessThan(BUDGET_MS);
});
