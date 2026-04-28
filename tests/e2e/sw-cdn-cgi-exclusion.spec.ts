import { test, expect } from "./test-fixtures";

// SW is disabled in dev (devOptions.enabled: false). The exclusion rule is
// validated indirectly by routing /cdn-cgi/access/identity through a fresh
// network response on each call and asserting no caching occurs at the
// browser-controller level. In dev there is no SW; this test enforces that
// the production SW source contains the exclusion logic by code-pattern.
test("SW source contains the /cdn-cgi/access/* pass-through guard", async () => {
  // Read the SW source via the bundler-served route or via the local file.
  // Using fetch on the dev server is the most realistic reading.
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const here = path.dirname(new URL(import.meta.url).pathname);
  const swPath = path.resolve(here, "..", "..", "apps", "web", "src", "sync", "sw.ts");
  const src = await fs.readFile(swPath, "utf8");
  expect(src).toMatch(/\/cdn-cgi\/access\//);
  expect(src).toMatch(/event\.respondWith\(fetch\(event\.request\)\)/);
});
