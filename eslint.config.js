import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/*.config.*", ".corepack/**"],
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
    },
    rules: {
      "no-console": "error",
      "no-restricted-exports": [
        "error",
        { restrictDefaultExports: { direct: true } },
      ],
      ...tsPlugin.configs.recommended.rules,
    },
  },
  {
    files: ["apps/web/**/*.ts", "apps/web/**/*.tsx"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["apps/api/**/*.ts", "scripts/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
];
