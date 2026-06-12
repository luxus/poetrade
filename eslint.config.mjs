import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import svelte from "eslint-plugin-svelte";
import svelteParser from "svelte-eslint-parser";
import prettier from "eslint-config-prettier";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  js.configs.recommended,

  // TypeScript
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // project disabled for initial WXT compatibility; re-enable for full type-aware when stable
      },
      globals: {
        chrome: "readonly",
        window: "readonly",
        document: "readonly",
        console: "readonly",
        fetch: "readonly",
        process: "readonly",
        __dirname: "readonly",
        clearTimeout: "readonly",
        setTimeout: "readonly",
        crypto: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error", // Enforced strictly (see AGENTS.md). Only minimal per-line disables in contents/filter-panel.ts for the unavoidable PoE site Vue reverse-engineering.
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },

  // Svelte
  ...svelte.configs["flat/recommended"],
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tsParser,
        project: "./tsconfig.json",
        extraFileExtensions: [".svelte"],
      },
      globals: {
        // Hardcoded browser + extension globals (strict mode - no broad rule disables)
        window: "readonly",
        document: "readonly",
        console: "readonly",
        navigator: "readonly",
        location: "readonly",
        history: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        chrome: "readonly",
        fetch: "readonly",
      },
    },
    rules: {
      // Svelte recommended rules kept as errors. Code will be fixed instead of disabled.
    },
  },

  // Prettier last (disables conflicting rules)
  prettier,

  {
    ignores: [
      "build/",
      ".wxt/",
      "node_modules/",
      "tmp*/",
      "coverage/",
      "tsconfig.tsbuildinfo",
      "package-lock.json",
      "scripts/", // legacy CJS build helpers; lint focus on lib/ + components/ + contents/
    ],
  },

  // Ensure browser + extension globals for content/UI code so no-undef can stay on.
  // We deliberately do NOT turn rules off broadly per contributor request.
];