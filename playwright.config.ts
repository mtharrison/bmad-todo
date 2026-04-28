import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // Tests share a single API server with persistent state. /admin/reset between
  // tests works only when tests do not run concurrently.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testDir: "./tests/e2e",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "perf",
      testDir: "./tests/perf",
      testMatch: "**/*.bench.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:4173",
      },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @bmad-todo/api dev",
      port: 3000,
      timeout: 120000,
      reuseExistingServer: !process.env["CI"],
    },
    {
      command: "pnpm --filter @bmad-todo/web dev",
      port: 5173,
      timeout: 120000,
      reuseExistingServer: !process.env["CI"],
    },
    {
      command: "pnpm --filter @bmad-todo/web preview --port 4173",
      port: 4173,
      timeout: 120000,
      reuseExistingServer: !process.env["CI"],
    },
  ],
});
