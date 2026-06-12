# CONTEXT.md — Poe Trade Plus

This document captures the domain language, constraints, and "why" behind the project. It is mandatory reading for any contributor or AI agent working on the codebase (see AGENTS.md).

## Mission
Poe Trade Plus is a browser extension (MV3) that injects a powerful, native-feeling companion sidebar directly into the official Path of Exile trade site (pathofexile.com/trade and regional mirrors, plus PoE2 trade).

Goal: Make recurring trade searches dramatically faster and more pleasant to save, organize, revisit, compare, and act on — without leaving the official site.

It is **not** a replacement for the trade site. It is an enhancement layer.

## Core Domain Concepts

- **TradeSiteVersion**: "1" (PoE1) or "2" (PoE2). Many behaviors branch on this (poe.ninja only for 1, different icons, socket warnings, etc.).
- **BookmarksFolder / BookmarksTrade**: User-saved searches live in folders. Folders and trades have stable IDs, support archive, reorder (drag or buttons), duplicate, rename, and completion toggle.
- **Export/Import format versioning**: Current is v4 (Base64 + JSON with versioned location string). Legacy v1–v3 must continue to deserialize for user backups. See `bookmarks.ts` serialize/deserialize.
- **History**: Automatically recorded visited searches (per version/league).
- **Finer Filters / main-world injection**: The most brittle part. We hook into the site's Vue app (`window.app`, children traversal) via `contents/filter-panel.ts` to allow adding/excluding stats directly from result hovers. This is intentional reverse-engineering because there is no official API/hook.
- **Result enhancements**: Equivalent pricing (chaos/divine via poe.ninja or official exchange), stat highlighting, max-socket warnings (PoE1 only).
- **Active tab coordination**: The extension tries to keep one "active" PoE trade tab so reopening a bookmark updates the existing tab instead of spawning many.
- **Ephemeral poe.ninja / exchange cache**: Stored with TTL in chrome.storage.local, keyed by league.

## Hard Constraints (non-negotiable)

- **No remote user data**. Everything is local (chrome.storage.local + localStorage fallbacks). Privacy policy is real.
- **Must survive official site changes**. The trade site heavily recycles DOM, uses Vue, changes class names and structure frequently. All content-script work (observers, selectors, main-world scripts) must be defensive.
- **MV3 + limited permissions**. Only `storage`, `tabs`, and narrow host_permissions. No webRequest, no broad scripting.
- **Chrome + Firefox parity** (via WXT).
- **PoE1 and PoE2**. Features must explicitly handle version branching. Default safe/no-op for the other version.
- **Performance on trade site**. MutationObservers, frequent re-enhance of result lists, and main-world injection must not make the official site feel slow or broken.
- **Versioned data**. Any persisted or exported structure (bookmarks, settings, etc.) must be forward- and backward-compatible or have a clear path.

## Non-Goals (for now)
- Full PoE2 feature parity on pricing/tools (we skip poe.ninja for v2).
- Live price alerts, multi-account, external APIs for user data.
- Becoming a full trade-site fork or overlay that replaces the official UI.
- Heavy test coverage on the DOM-observer / Vue-hack layers (contract + manual verification + the pure service logic is the priority).

## Maintenance Hotspots (where slop is most dangerous)
- `contents/filter-panel.ts` + `components/FinerFilters.svelte` (Vue internals)
- `lib/services/item-results.ts` and `bulk-sellers.ts` (MutationObserver + fragile selectors on `.result-item`, price containers, etc.)
- `background.ts` (the two proxy message types)
- Any code that touches `chrome.storage` key formats or export strings

All changes touching these areas must be manually verified on live PoE1 and PoE2 trade pages.

## How We Prevent AI Slop
See `AGENTS.md`. In short:
- Vertical slices only.
- Tests required for new service / pure logic.
- Docs (this file, ARCHITECTURE.md, ADRs) must be updated for cross-cutting changes.
- Strict rules on `any`, selectors, and data versioning.
- Existing patterns (class-based services with normalization, versioned exports, defensive observers) must be respected or an ADR + exception must be created.

When in doubt while editing, re-read AGENTS.md and this file.

---

Last major update: 2026-06-12 (initial modernization effort)