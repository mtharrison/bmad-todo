import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";
import importPlugin from "eslint-plugin-import";

export default [
  js.configs.recommended,
  {
    ignores: ["**/dist/**", "**/node_modules/**", ".corepack/**"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
    },
    rules: {
      "no-console": "error",
      "import/no-default-export": "error",
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            // components → store → sync; no reverse imports
            { target: "./apps/web/src/components", from: "./apps/web/src/sync" },
            { target: "./apps/web/src/store", from: "./apps/web/src/components" },
            { target: "./apps/web/src/sync", from: "./apps/web/src/components" },
            { target: "./apps/web/src/sync", from: "./apps/web/src/store" },
          ],
        },
      ],
      ...tsPlugin.configs.recommended.rules,
    },
  },
  {
    // Config files require default exports by their respective frameworks
    files: ["**/vite.config.ts", "**/vitest.config.ts", "playwright.config.ts"],
    rules: {
      "import/no-default-export": "off",
    },
  },
  {
    files: ["apps/web/**/*.ts", "apps/web/**/*.tsx", "vitest.setup.ts"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["apps/api/**/*.ts", "scripts/**/*.ts", "playwright.config.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["tests/e2e/**/*.ts"],
    languageOptions: {
      globals: globals.browser,
    },
  },
];
