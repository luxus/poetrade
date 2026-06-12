# ADR-005: Site Integration Strategy — Preserve Magic "Instant Filter Add" UX While Reducing Hacks

**Date**: 2026-06-12  
**Status**: Accepted  
**Deciders**: luxus (project owner)

## Context

The "Finer Filters" feature (preset groups + hover-over result stats → instant +/- buttons that directly add/exclude the stat) is one of the most beloved and "magical" parts of Poe Trade Plus.

This feature currently requires deep reverse-engineering of the official Path of Exile trade site's internal Vue.js component tree (`window.app`, `$children`, `stat-filter-group` instances, direct mutation of filter state + `window.app.save(true)`).

See:
- `contents/filter-panel.ts`
- `components/FinerFilters.svelte`
- `entrypoints/filter-panel.content.ts` (main-world injection)
- Legacy equivalent was in `scripts/bg.js` (removed 2026-06-12; logic lives in `lib/site-adapter/`)

The site (especially PoE1) exposes no stable public API for programmatically adding arbitrary stat filters from result items.

The extension itself uses Svelte + WXT. The Vue hacks are only needed to interact with the *site's* UI layer.

Current problems:
- Extremely brittle (PoE site changes regularly break it).
- Full of `any`, `Function`, DOM + Vue traversal mixed together.
- Hard to test, hard to extend to PoE2.
- Major source of maintenance burden and potential for low-quality changes.

The project now has strong anti-slop guardrails (AGENTS.md, CONTEXT.md, ADRs, tests, lint, CI).

User requirements for this modernization:
- **No feature loss**.
- The "instant appear" magic (hover stat in results → buttons that immediately affect the site's active filters) **must stay exactly as good or better**.
- Focus on PoE2.
- Large rewrites are acceptable if they make the code significantly cleaner with fewer hacks.
- No compromises on the quality of the filter-adding UX.

## Decision

We will **keep the exact current "magic" UX** for the filter-adding feature (direct, instant manipulation visible in the site's filter UI and results).

At the same time we will **modernize the implementation** with these principles:

1. **Encapsulation first**  
   All site-interaction logic (DOM scraping, event simulation, Vue poking, filter mutation) must live in a single, well-documented place: `lib/site-adapter/`.

2. **Adapter pattern with strategy fallback**  
   Create a `PoeTradeSiteAdapter` (or versioned adapters) that offers high-level methods:
   - `addStatFilter(hash: string, mode: 'include' | 'exclude')`
   - `removeStatFilter(hash: string)`
   - `getActiveFilters()`
   - etc.

   Inside the adapter we try strategies in order of preference:
   - Clean DOM + native event simulation (preferred long-term)
   - Filter string generation + injection into search/advanced filters
   - Direct Vue poking (current implementation, kept as last resort for magic UX, heavily guarded)

3. **PoE1 vs PoE2**  
   PoE1 will keep the existing behavior via the adapter (no regression).  
   PoE2 will get first-class support as the primary focus going forward. A PoE2 adapter implementation (even if initially partial) is required.

4. **No new direct hacks**  
   From now on, no code outside the site-adapter is allowed to touch `window.app`, `$children`, or raw site Vue internals. This is enforced by AGENTS.md.

5. **Documentation & tracking**  
   - This ADR
   - Updated `CONTEXT.md` and `AGENTS.md`
   - Dedicated GitHub issues for the migration steps (so the work is traceable even if done in multiple PRs)

## Consequences

**Positive:**
- The beloved "zauber"-like filter UX is preserved 100% for PoE1.
- Future PoE2 support becomes possible without duplicating hacks.
- The hack surface is contained and auditable.
- Easier to eventually replace the Vue poking with more stable techniques.
- Aligns with the project's anti-AI-slop goals (clear boundaries, documented decisions, testable abstractions).

**Negative / Risks:**
- Initial implementation cost is non-trivial (large but acceptable rewrite per owner).
- The adapter will still contain the "dirty" Vue code for PoE1 in the short-to-medium term.
- PoE2 may require similar poking initially until a cleaner path is found.

**Migration plan (tracked via issues):**
- Extract current logic into `lib/site-adapter/poe1-adapter.ts` (keep behavior byte-for-byte identical).
- Update `filter-panel.ts`, `FinerFilters.svelte` etc. to only talk to the adapter.
- Create PoE2 adapter stub + basic support.
- Add adapter tests (at least for the public interface).
- ~~Deprecate/remove direct Vue code from legacy `scripts/`.~~ Done: `scripts/bg.js` and `scripts/cs.js` removed; use `contents/filter-panel.ts` + `lib/site-adapter/`.
- Evaluate and implement cleaner strategies (DOM simulation) over time.

## Alternatives Considered

- Remove deep Vue poking entirely → would degrade or remove the instant filter UX → rejected (user requirement).
- Keep everything as-is but add more comments → does not reduce hack surface or improve maintainability for PoE2.
- Pure string-based approach only → loses the "buttons appear on the exact mod you hovered" magic → rejected.

## References

- Original deep hack: `contents/filter-panel.ts`
- AGENTS.md (especially content-script discipline section)
- CONTEXT.md (maintenance hotspots)
- ADR-004 (DOM observer strategy)
- Modernization plan (Phase 2 site-adapter extraction)

This decision was made because preserving the exact user-facing magic of the filter feature is non-negotiable, while the internal implementation must become modern, contained, and PoE2-ready.