You are an expert software engineer continuing the modernization of the "Poe Trade Plus" browser extension (PoE1 + PoE2 trade site companion with sidebar, bookmarks, history, result enhancements, and the key "Finer Filters" feature).

**Project Overview**
- Browser extension (WXT + Svelte 5 + TS) that injects into pathofexile.com/trade (and PoE2 /trade2).
- Core value: "Magic" Finer Filters UX – hover a stat on a result item, instant +/- buttons appear that directly add/exclude the modifier to the site's active filters (feels instant/magical, no page reload).
- Must preserve this exact UX 100% (no regression, no compromises) for PoE1. Extend beautifully to PoE2.
- Current focus: Clean, professional, hack-free codebase ("pure genius" – elegant architecture, Strategy pattern, minimal anys, no scattered workarounds). PoE2 priority. Follow strict anti-slop rules.

**Current Architecture (as of latest main)**
- Central abstraction: `lib/site-adapter/poe-trade-adapter.ts` (thin facade) + `ISiteStrategy` interface.
  - `PoE1SiteStrategy`: Encapsulates the (necessary) Vue internals poking for the exact PoE1 magic UX. All site quirks isolated here.
  - `PoE2SiteStrategy`: Clean, DOM/event-first implementation (no deep hacks). Currently has result mod scanning/attachment, clean search injection + trigger for "instant" adds, scrape for filtered state, support for globals/presets. Buttons appear on PoE2 results; clicking does useful instant filter update.
- Callers (especially `contents/filter-panel.ts`) are now ultra-thin: pure DOM helpers, observers for results, button templates, delegation ONLY to adapter for anything site-related (scan, decorate, attach, add/removeStatFilter, applyGlobal, etc.).
- `filter-panel.content.ts` (main-world) now supports both PoE1 and PoE2 URLs.
- UI polish from upstream (compact mode, inline buttons, hover fixes, layout refresh) integrated cleanly via the adapter.
- Strict lint (ESLint flat with TS/Svelte), typecheck, Vitest (basic coverage on services), CI on PR/main (typecheck + lint + build + audit).
- Docs: AGENTS.md (mandatory reading – vertical slices, no new hacks outside adapter, update docs/ADRs for changes, PoE1 vs PoE2 branching, etc.), CONTEXT.md, 5 ADRs (esp. ADR-005 on site integration strategy), modernization plan.

**Key Constraints (non-negotiable)**
- **Magic UX sacred**: The "hover result mod → instant +/- buttons that directly affect site's filter state and refresh results" must feel exactly as magical as before (or better). No feature loss. For PoE2, achieve equivalent "instant" feel with clean methods (DOM simulation, events, injection + triggers). Test mentally/live on both sites.
- No hacks/workarounds outside the adapter. All PoE site interaction (DOM, any poking for PoE1, etc.) MUST go through the adapter/strategies. Update strategies for PoE2 improvements.
- Follow AGENTS.md strictly: Read it first. Vertical slices only. Update ARCHITECTURE/CONTEXT/ADRs for cross-cutting changes. Prefer clean abstractions over quick fixes. No uncontrolled `any` outside the documented adapter exception. Test manually on live PoE1 + PoE2 trade after site-touching changes.
- PoE2 focus: Prioritize clean, scalable PoE2 implementation in PoE2Strategy. PoE1 must remain identical.
- Clean, well-programmed codebase: Strategy pattern is the model – pluggable, documented, easy to evolve (e.g., replace PoE1 poking later). Reduce anys further where possible (use unknown + casts, better interfaces for Vue objects we touch). Thin callers. Good types, JSDoc, separation of concerns.
- CI must stay green (or we fix it): Currently relaxed max-warnings during cleanup, but target strict 0 real errors. Fix lint (no-undef via globals or proper, any only where unavoidable with comments, Svelte intentional patterns as warn).
- Preserve behavior for PoE1 exactly (logic 1:1 in PoE1Strategy).

**What Has Been Accomplished (latest on main)**
- Full modernization foundation: AGENTS.md, CONTEXT.md, ADRs (001-005, especially 005 for site strategy), issues (#1 parent + #8 adapter extraction done, #9 PoE2 magic in progress, #10 legacy cleanup).
- Site adapter extraction complete: All direct Vue/DOM filter logic moved from contents/filter-panel.ts into adapter + strategies. Panel is now clean orchestrator.
- PoE2 groundwork: URL support, PoE2Strategy with DOM selectors, button attachment (with javijec compact/inline polish), clean add/remove via injection + search trigger (feels magical), state scrape for "already filtered".
- UI/UX polish integrated (from javijec's recent commits on compact results, button sizing/hover, inline placement, layout refresh).
- Lint hygiene: Component handler params swept with _ prefixes (no more unused event/id/key noise in .svelte). Globals expanded for DOM/WXT/browser. Any rule to warn temporarily (anys now mostly isolated to adapter poking). Svelte intentional rules (@html for icons, reactivity) set to warn.
- Other: Typecheck clean, basic tests, CI (typecheck/lint/build/audit), removed build artifacts, README fixes, etc.
- No feature regression on magic for PoE1; PoE2 additive with clean path.

**Open / Next Priorities (start here – what makes most sense)**
1. **Finish PoE2 Magic (highest priority, issue #9)**: Make the full "instant buttons on hovered result stats" work on PoE2 trade site with the same magical UX (buttons appear instantly on hover, click directly affects active filters and refreshes results live). 
   - Use PoE2Strategy (DOM-first – no deep Vue if avoidable; prefer events, querySelector for filter UI, simulation of add/remove).
   - Refine PoE2 modSelectors for accurate result stat elements (test mentally against PoE2 trade DOM: result-item, mod elements, etc.).
   - Ensure "is already filtered" works via scrape (already partially there).
   - For add/remove: Enhance beyond basic injection – find PoE2's filter groups/panel and manipulate cleanly (or best available non-hack). Trigger site updates for instant feel.
   - Global presets from sidebar must also "just work" magically on PoE2.
   - Hook layout refresh if needed.
   - Verify: Buttons only on PoE2 results when supported; graceful if not. No breakage to PoE1.
   - Update filter-panel.ts minimally if needed (it should just delegate).
2. **Further clean codebase / 0 errors**:
   - Tighten any rule back to error after PoE2 is solid (or keep warns only in strategies).
   - Fix remaining any (use unknown + targeted casts; add more // eslint-disable-line only in adapter for true poking).
   - Clean legacy (scripts/bg.js, cs.js – remove or fully deprecate old direct hacks, point to adapter).
   - Fix any remaining no-unused, no-undef (globals should cover; qualify or import types if needed). Target 0 errors in `npm run lint -- --max-warnings=0`.
   - Polish: Better types in strategies (interface for the Vue objects we touch in PoE1, even if approximate), more JSDoc, remove dead code (e.g., reHashed remnants).
   - Add tests for adapter (at least PoE1/PoE2 paths for add/remove, decorate).
3. **Verify + stabilize**:
   - Full `npm run build` + manual test plan: Load unpacked in Chrome/Firefox. Test PoE1 trade (magic exactly as before + all features). Test PoE2 trade (new magic works, no crashes, presets + result buttons).
   - If PoE2 site structure differs (e.g., no direct equivalent to PoE1 filter groups), document and use best clean approximation that preserves "magic" feel.
   - Update CI back to strict if possible. Fix any build/lint regressions.
4. **Docs/Tracking**:
   - Update ADR-005 or add new if PoE2 impl reveals new tradeoffs.
   - Comment on issues #9, #1 with progress.
   - Update ARCHITECTURE.md, CONTEXT.md, AGENTS.md if architecture changes.
   - Vertical slices only – small, reviewable, tested changes.

**How to Work (mandatory)**
- Start by reading (in order): AGENTS.md (rules!), CONTEXT.md, ADR-005 (site strategy), lib/site-adapter/* (interface + both strategies + facade), contents/filter-panel.ts (see how thin it is), .github/workflows/ci.yml.
- All site interaction MUST go through poeTradeAdapter (the facade). Extend strategies, never bypass.
- For PoE2 changes: Prioritize clean (DOM, events, querySelector). Only fall back to poking if truly required for magic UX, and document.
- Test: After any site-touching change, mentally simulate or note live test on both PoE1 and PoE2 trade pages. Preserve exact button behavior/timing/feel.
- No AI slop: Small vertical slices. Update docs/ADRs for decisions. Prefer abstractions (Strategy is model). Run `npm run lint`, `npm run typecheck`, `npm run build`, `npm test` before committing. Use _ for unused params.
- Git: Work on main or feature branch from latest. Commit frequently with clear messages referencing issues/ADRs.
- Tools: You have full code access. Use grep/read for exploration. If needed, suggest terminal commands for build/test.

**Current State (post latest cleanups)**
- Lint: ~63 problems (mostly warnings now; ~20 errors are isolated anys in adapter + Svelte intentional). Component handlers swept clean with _. Globals expanded. any rule warn temporarily.
- Typecheck: Clean.
- Build: Should succeed (syntax fixes from comment cleanups applied).
- Architecture: Strategy in place and working. PoE2 has functional (if basic) magic path. PoE1 unchanged.
- Open: PoE2 full polish, anys reduction, legacy cleanup, tests, verification.
- Branch: On main, up to date with all modernization + PoE2 groundwork + javijec UI + lint sweep.

**Success Criteria for This Handoff**
- PoE2 magic feels as instant/magical as PoE1 (buttons on hovered mods, direct filter effect).
- Codebase cleaner: Fewer anys, no legacy hacks outside adapter, Strategy used everywhere for site stuff.
- 0 real lint errors where possible (or documented).
- Extension builds and PoE1 works exactly as before; PoE2 works with new support.
- Docs/issues updated.
- Followed AGENTS.md – no slop.

Continue from here. Start with PoE2 magic in the strategy (or whatever makes most sense next for cleanliness). Ask clarifying questions if needed, but drive progress on clean PoE2-first architecture while preserving the core magic UX.

Good luck – make it genius!
