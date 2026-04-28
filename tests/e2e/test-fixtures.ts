import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  page: async ({ page, request }, use) => {
    // Reset server-side state. Test-only endpoint — never available in prod.
    // Browser IDB is empty by default in a fresh Playwright context, so no
    // additional client-side wipe is needed (addInitScript would re-run on
    // every reload and defeat the persistence cache under test).
    //
    // Retry-reset loop: the fire-and-forget outbox architecture means a prior
    // test's in-flight drain may land on the server between resets. We reset,
    // wait for in-flight requests to settle, verify the server is empty, and
    // repeat if stragglers arrived.
    for (let attempt = 0; attempt < 5; attempt++) {
      await request.post("/admin/reset");
      await new Promise((r) => setTimeout(r, 100));
      const res = await request.get("/tasks");
      const body = (await res.json()) as unknown[];
      if (body.length === 0) break;
    }
    await use(page);
  },
});

export { expect };
