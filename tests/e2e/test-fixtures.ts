import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  page: async ({ page, request }, use) => {
    // Reset server-side state. Test-only endpoint — never available in prod.
    // Browser IDB is empty by default in a fresh Playwright context, so no
    // additional client-side wipe is needed (addInitScript would re-run on
    // every reload and defeat the persistence cache under test).
    await request.post("/admin/reset");
    await use(page);
  },
});

export { expect };
