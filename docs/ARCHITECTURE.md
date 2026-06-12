# Architecture Map

## Product flow

`contents/index.svelte` is the real entrypoint of the extension.
It injects base styles, shifts the Path of Exile trade page to make room for the sidebar, initializes enhancement services, and mounts `components/Layout.svelte`.

## UI composition

- `components/Layout.svelte`: top-level sidebar shell, page navigation, flash messages
- `components/Header.svelte`: branding and collapse toggle
- `components/pages/Bookmarks.svelte`: folder management, import/export, backup restore
- `components/BookmarkFolder.svelte`: renders trades within each folder and folder-level actions
- `components/pages/History.svelte`: persisted trade-search history
- `components/pages/PinnedItems.svelte`: in-memory pinned result cards
- `components/pages/About.svelte`: project metadata and repository link

## Core services

- `lib/services/storage.ts`: wrapper around `chrome.storage.local` plus localStorage helpers
- `lib/services/bookmarks.ts`: bookmark folders, trades, backup serialization and restore
- `lib/services/trade-location.ts`: parses the current trade URL, polls for navigation changes, logs history
- `lib/services/item-results.ts`: observes result rows and injects pinning, highlights and price equivalents
- `lib/services/poe-ninja.ts`: fetches and caches currency ratios through the background script
- `lib/services/page-title.ts`: keeps the browser tab title aligned with the current search context
- `lib/services/search-panel.ts`: scrapes the live search UI to infer names, rarity and stat filters

## Site adapter (Finer Filters / trade-site integration)

All interaction with the official trade site's filter UI lives in `lib/site-adapter/` (see ADR-005). Callers must not touch `window.app` or Vue internals directly.

- `poe-trade-adapter.ts` — facade; picks PoE1 vs PoE2 strategy from the URL (`/trade` vs `/trade2`)
- `poe1-strategy.ts` / `poe2-strategy.ts` — version-specific implementations
- `vue-filter-helpers.ts` — encapsulated Vue poking for stat-filter mutation (PoE1 primary; PoE2 when `window.app` exists)
- `mod-decoration.ts` — shared DOM helpers (hash extraction, +/- button attachment)
- `stat-hash-map.ts` — preset key → stat id map for Finer Filters sidebar presets

**Main-world content script:** `entrypoints/filter-panel.content.ts` loads `contents/filter-panel.ts`, which observes result rows, injects +/- buttons, and delegates every filter mutation to `poeTradeAdapter`.

## Background responsibilities

`background.ts` currently handles:

- proxying poe.ninja API requests through extension messaging
- proxying official trade exchange rate POST requests

## Current caveats

- The popup is informational only; the main product experience lives on the trade website itself.
- Pinned items are session-only and are not persisted to extension storage.
- The codebase still includes generated folders such as `build/` and `.wxt/` locally, but source changes should happen in the top-level source files.
