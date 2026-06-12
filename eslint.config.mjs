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
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": ["warn", { ignoreRestArgs: true }], // Strict in lib/ (see below); contents/ has unavoidable Vue hacks per AGENTS.md
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "off",
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
    },
    rules: {
      "svelte/require-each-key": "warn",
      "svelte/no-at-html-tags": "warn", // intentional for dynamic icon markup in menus
      "svelte/infinite-reactive-loop": "warn",
      "svelte/prefer-svelte-reactivity": "warn", // Date/Map used in some places for non-reactive data (icons, etc.)
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

  // Content scripts and UI components run in browser context with DOM + chrome globals
  {
    files: ["contents/**/*", "entrypoints/**/*", "components/**/*.svelte", "components/**/*.ts"],
    rules: {
      "no-undef": "off",
      "@typescript-eslint/no-unsafe-function-type": "off", // unavoidable in Vue hack layer (contents/filter-panel)
    },
  },
];