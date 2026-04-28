import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    include: [
      "packages/**/*.test.ts",
      "apps/**/*.test.{ts,tsx}",
      "apps/**/*.integration.test.ts",
      "tests/property/**/*.test.ts",
    ],
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    env: { NODE_ENV: "test" },
  },
});
