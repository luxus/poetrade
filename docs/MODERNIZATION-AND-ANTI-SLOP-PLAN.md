# Poe Trade Plus — Modernization & Anti-AI-Slop Plan

**Status**: Draft based on initial post-clone/fork analysis (2026-06-12)  
**Repo**: Fresh clone of (fork of) KroxiLabs/Kroxitrade + javijec/PoeTradePlus activity  
**Goal**: Modernize the extension, fix problems/security issues, and strengthen mechanisms so that future expansions (features, refactors, PoE site changes) stay high-quality and do **not** accumulate "AI slop".

## Executive Summary

Poe Trade Plus is a well-structured browser extension (WXT + Svelte + TS) that injects a powerful companion sidebar + enhancements into the official Path of Exile trade site (PoE1 + partial PoE2). The core domain logic (bookmarks/folders with versioning + serialization, history, result tools, settings) is cleanly separated into services.

**Strengths**:
- Modular services with clear responsibilities.
- Good data versioning (export formats 1-4 in bookmarks.ts).
- Architecture doc exists.
- Minimal permissions, MV3, local-only storage, privacy-respecting.
- Active fork activity and detailed (Spanish) PR/release process.

**Critical gaps** (high risk for slop on extension):
- **Zero automated tests**.
- **No linting** (only Prettier).
- **No CI quality gates** on PRs.
- **No agent/contributor guidance docs** (no CONTEXT.md, ADRs, strict coding rules).
- Committed build artifacts.
- Heavy, fragile DOM + Vue reverse-engineering in content scripts (filter-panel.ts, item-results, bulk-sellers).
- Svelte 5 used in package.json but components still use Svelte 4-era patterns (stores + onMount).

**Security**:
- 12 vulnerabilities from `npm audit` (3 critical, 4 high) — mostly transitive via WXT/web-ext-run dev tooling (shell-quote, tmp, devalue, svelte SSR issues). Runtime risk lower because no SSR and limited privileged code, but still needs attention.
- No obvious secrets or malicious patterns.
- Main risk: brittle injection points + potential PoE site changes.

**Recommended approach**: 4-phase plan. Start with hygiene + gates (P0/P1) **before** adding big features. This creates "friction against slop".

## 1. Current State Snapshot

### Tech Stack (actual vs docs)
- WXT ^0.20.20 (MV3)
- Svelte ^5.38.1 (package.json:29) — **README claims "Svelte 4" (outdated)**
- TypeScript 5.3.3 (old; current ~5.5+)
- Sass, lucide-static, js-base64
- No ESLint, no test runner, no Vitest/Jest/Playwright
- Custom CJS scripts in `/scripts` for WXT Firefox + versioning + packaging
- i18n for EN/ES/PT/RU/TH/DE/FR/JP/KO

### Structure Highlights
- `entrypoints/`: WXT-defined (background, content scripts, popup)
- `contents/`: Main injection (trade-sidebar.content.ts mounts `contents/index.svelte`)
- `components/`: Svelte UI (Layout, pages for Bookmarks/History/Settings/etc., FinerFilters, menus)
- `lib/services/`: Core domain (bookmarks, item-results, bulk-sellers, poe-ninja, trade-location, settings, storage, search-panel, etc.)
- `lib/types/`, `lib/utilities/`, `lib/styles/`
- `docs/`: ARCHITECTURE.md (good), GUIA-PR-Y-RELEASE.md (detailed workflow), LAUNCH-FEATURES.md (bilingual)

### Integration Hotspots (fragile)
- `contents/filter-panel.ts`: ~350+ LOC of delegated events + heavy `(window as any).app` Vue $children traversal + `innerHTML` templates to hook "Finer Filters" into the site's Vue app. Lots of `any`.
- `lib/services/item-results.ts` + `bulk-sellers.ts`: MutationObservers + fragile selectors (`.search-results .result-item`, `.row`, price containers, etc.) + PoE1 vs PoE2 branching.
- Background proxy (`background.ts`): CORS bypass for poe.ninja + official trade exchange POSTs.

These are necessary for "native" feel on a 3rd-party site but are maintenance magnets.

### Git & Hygiene
- `.gitignore` covers `build/`, `.wxt/`, `node_modules/`, `.tsbuildinfo`, `.env*` reasonably.
- **However, tracked in git** (confirmed via `git ls-files`):
  - `tsconfig.tsbuildinfo`
  - `tmp_video_frames/` (contact sheets + 15 frame pngs — appears to be dev/video artifact)
- 188 commits, recent fork syncs.
- No PR templates, issue templates, or CONTRIBUTING.md visible at time of analysis.

### CI/CD (`.github/workflows/`)
- `release.yml`: On `v*` tag → build both browsers → gh-release with zips. Node 20, good actions.
- `submit.yml`: Manual `workflow_dispatch` for Chrome Web Store via Plasmo bpp (requires `SUBMIT_KEYS` secret).
- **No PR checks**: No lint, typecheck, test, or even `npm run build` validation on every PR.

## 2. Security Analysis

### npm audit (run at analysis time)
- 12 issues: 3 critical, 4 high, 5 moderate.
- **Critical**: shell-quote (via fx-runner → web-ext-run → wxt dev chain). Affects Firefox dev/packaging path.
- **High**: devalue (Svelte serialization DoS — affects SSR/hydration paths), tmp (path traversal in build tooling).
- **Svelte moderate**: Several SSR/XSS vectors (DOM clobbering, spread attrs, promise serialization, ReDoS in `<svelte:element>`). Lower impact here (client-side content script sidebar, no server rendering in the extension itself).
- **Other**: brace-expansion, postcss, uuid (mostly transitive dev).
- `overrides` already present in package.json for content-security-policy-parser + msgpackr.
- **Fixability**: Many have `npm audit fix`, but some are deep transitive in WXT 0.20 and web-ext-run. May require WXT upgrade or overrides + acceptance of residual dev risk.

### Extension-specific risks (low-medium)
- **Permissions model**: `storage`, `tabs` + narrow host_permissions for PoE domains + poe.ninja. Excellent (no `<all_urls>`, no webRequest, no scripting broadly).
- **Background proxy**: Only two controlled message types. Fetch to known good origins. Good.
- **Content script execution**: Runs in page context + isolated. Uses `createIntegratedUi`. `window` hacks in filter-panel are contained.
- **Storage**: Local only, with league-keyed namespacing and ephemeral TTLs. No sync or remote.
- **Privacy**: Matches the stated policy. Good.
- **DOM injection / innerHTML**: Used in controlled ways (static templates for icons/presets, debug). Not fed arbitrary user/remote HTML. Acceptable for this domain but should be documented and minimized.
- **No eval/new Function/dynamic script injection** found.
- **Supply chain**: Relies on WXT (good project) but brings heavy dev tooling. Published extension zips are built from source.

**Recommendations (see phases)**: Run audit fix, add `npm audit` (or `audit-ci`) to CI, update WXT/TS when safe, add Svelte patch, monitor transitive.

## 3. Problems & Modernization Opportunities

### Quick wins (low risk)
- Update README Tech Stack section (Svelte 5, not 4).
- Remove committed artifacts (`git rm --cached tsconfig.tsbuildinfo`, remove tmp_video_frames/ from history or just ignore + clean).
- Add `typecheck` and `lint` scripts (even before full ESLint).
- Bump TypeScript 5.3.3 → latest 5.x.
- Update transitive where possible; add `overrides` for remaining high/critical if needed.
- Make CI run on PRs (build + new checks).
- Add `npm outdated` awareness or Renovate/Dependabot.

### Medium
- Add ESLint + `@typescript-eslint` (strict) + Svelte-specific rules. Enforce in CI.
- Add Vitest (or similar) for pure units: bookmarks serialization, storage wrapper, utilities, poe-ninja cache logic, trade-url, etc. (DOM-heavy parts can start with contract tests or later Playwright).
- Incrementally adopt Svelte 5 runes in new/refactored components (keep stores for shared services for now; runes shine in local component state).
- Tighten types: Reduce `any` in `lib/` (storage payload, etc.). Keep documented `any` + interfaces in `contents/filter-panel.ts` and explain the Vue contract.
- Extract selector constants / site-adapter module so PoE site changes are localized (one file to update on trade site redesigns).
- Improve PoE2 parity (equivalent pricing currently skipped for v2; official exchange ratios exist via the proxy).
- Clean up debug logging (make verbose debug opt-in via setting or `page-debug` util).

### Larger / strategic
- Evaluate WXT version bumps and whether custom scripts can be reduced.
- Consider contribution to upstream vs long-term fork maintenance.
- Add visual regression or snapshot testing for injected UI if it grows.
- Internationalization: current system works but could be extracted further.

## 4. Anti-AI-Slop Assessment & Defenses

### Current State (what protects quality today)
- Service-oriented architecture (class-per-concern, e.g. `BookmarksService` in `lib/services/bookmarks.ts:32` with explicit methods, normalization, events).
- Data versioning + backward-compat deserialization.
- Some documentation (ARCHITECTURE.md describes flows and caveats).
- Detailed PR/release guide (GUIA-PR-Y-RELEASE.md) — forces structured workflow.
- TypeScript (catches some nonsense).
- Prettier with import sorting.

These make **organic** contributions better but are **weak against AI-generated additions**.

### Major Gaps (why slop will creep in on expansion)
- **No tests** → AI can add plausible but wrong behavior; humans/reviewers can't easily verify.
- **No lint/type gates in CI** → "it builds" is the only bar.
- **No living project context** → No `CONTEXT.md`, domain glossary, "why we did X", constraints (e.g. "content scripts must survive PoE DOM recycling and Vue internals").
- **No ADRs** → Decisions (Svelte stores vs runes, observer strategy, export format versioning) are implicit. AI will rediscover or contradict them.
- **Fragile surface area** (DOM + Vue) + no guardrails → Tempting to "just add another querySelector hack".
- **Sparse contribution docs** → No explicit "definition of done" (update ARCHITECTURE, add tests for new service logic, etc.).
- No automated review signals (size of change, new any, new console.log in prod paths, etc.).

**Result**: The project is currently "slop-friendly" for large additions despite decent internal structure.

### Required Defenses (to add)
1. **Tests for logic** (services, utilities, pure functions). Even 60-70% coverage on non-DOM code raises the bar dramatically.
2. **Strict lint + format in CI** (blocks merge).
3. **Project memory docs**:
   - `CONTEXT.md` (goals, users, constraints, PoE1/PoE2 differences, "we scrape because we have no official API").
   - `docs/adr/` (lightweight ADRs for key choices).
4. **AGENTS.md / contributor guide** that explicitly calls out anti-slop rules (e.g. "New persistent state or serialization must be versioned and tested", "All DOM enhancements must go through documented adapters", "Update ARCHITECTURE.md for cross-cutting changes").
5. **PR template** with checklist (tests?, docs update?, PoE1+PoE2 verified?, no new top-level anys?).
6. **CI that fails fast** on quality (typecheck, lint, test, build, perhaps size or dep audit).
7. **Human + automated review culture** (even if solo, the checklist + failing CI forces deliberation).

These are exactly the patterns used in high-quality codebases to keep AI-augmented work from degrading the signal.

## 5. Prioritized Modernization Plan

### Phase 0: Hygiene & Safety (1-3 days, do first)
- [ ] Clean git history of artifacts: `git rm --cached tsconfig.tsbuildinfo`; remove `tmp_video_frames/` (or add to gitignore + filter-repo if wanted); update `.gitignore` to be stricter (e.g. `tsconfig*.tsbuildinfo`, `tmp*/`).
- [ ] `npm audit fix` + review remaining; add more `overrides` or WXT bump if safe. Add `audit-ci` or simple `npm audit --audit-level=high --production` check (production only for runtime).
- [ ] Fix README (Tech Stack: Svelte 5, current WXT/TS).
- [ ] Add root `typecheck` script: `tsc --noEmit`.
- [ ] Run `npm run build` clean on main and note any warnings.
- [ ] Remove or document `tsconfig.tsbuildinfo` presence.
- [ ] Create `docs/MODERNIZATION-AND-ANTI-SLOP-PLAN.md` (this file) + link from README.

### Phase 1: Quality Gates (1-2 weeks)
- [ ] Introduce ESLint (flat config) + `@typescript-eslint/recommended-type-checked` + svelte-eslint-parser or official Svelte rules. Strict `no-explicit-any` (with exceptions file for `contents/`), no-console rules (or allow tagged), etc.
- [ ] Add Vitest. Write initial tests for:
  - `lib/services/bookmarks.ts` (serialize/deserialize roundtrips, versioning, reorder, archive).
  - `lib/utilities/*` (slugify, trade-url, unique-id, escape-regex, date-delta).
  - Storage service contracts + expiration.
  - Settings defaults + load/save.
- [ ] CI update: On every PR/push to main:
  - `npm ci`
  - lint + format check
  - typecheck
  - test
  - build (both browsers)
  - (optional) `npm audit` non-blocking or production-only.
- [ ] Add Dependabot (`.github/dependabot.yml`) for npm + GitHub Actions.
- [ ] PR template (`.github/pull_request_template.md`) with anti-slop checklist.
- [ ] Scripts: Consider folding custom runners into WXT config or npm scripts where possible.

**Deliverable**: "PR that touches logic must add or update tests" becomes enforceable.

### Phase 2: Code & DX Modernization (ongoing, parallel with features)
- [ ] Incrementally convert components to Svelte 5 runes where it simplifies (new pages, modals, menus first). Keep service layer on stores for cross-component reactivity if desired.
- [ ] Introduce a thin `lib/site-adapter/` or constants file for all PoE selectors + version guards. Update item-results, bulk-sellers, filter-panel, trade-location to use it. Add comments like "PoE trade site selector — last verified 2026-xx against X".
- [ ] Tighten types across `lib/`.
- [ ] Add a debug flag/setting that enables `emitPageDebug` + extra console without polluting normal usage.
- [ ] PoE2 enhancements: equivalent pricing via official exchange data (already proxied), socket warnings or other PoE2 analogs.
- [ ] Evaluate svgo / lucide-static / svelte-preprocess updates (outdated per `npm outdated`).
- [ ] Consider moving more "quick action" or filter logic out of the Vue-hack file if the site ever exposes better hooks.

### Phase 3: Documentation & Permanent Anti-Slop Defenses (high leverage)
- [ ] Create `CONTEXT.md` at root:
  - Product mission.
  - Key domain concepts (TradeSiteVersion, folder lifecycle, active tab coordination, ephemeral cache, "finer filters" as main-world Vue injection).
  - Hard constraints (no remote data exfil, must survive site DOM churn, MV3 limits, Firefox + Chrome parity).
  - Non-goals.
- [ ] Seed `docs/adr/` with 3-5 lightweight records:
  - ADR-001: Why WXT + integrated UI over separate popup or full page.
  - ADR-002: Data model versioning strategy for bookmarks.
  - ADR-003: Background proxy for poe.ninja + trade exchange.
  - ADR-004: Observer + DOM enhancement approach vs. other options.
  - ADR-005: Svelte stores for services (current) and future runes migration path.
- [ ] Create or expand `CONTRIBUTING.md` / `AGENTS.md`:
  - "Definition of done" for changes.
  - "When touching content scripts or services: add unit test + update ARCHITECTURE.md".
  - "Prefer extracting to adapter before adding another 50 lines of querySelector in a service".
  - Link to this plan and CONTEXT.
- [ ] Update ARCHITECTURE.md with "Maintenance hotspots" and "Extension points" sections.
- [ ] Bilingual or English-first docs? Decide policy (current PR guide is Spanish-only; README English).
- [ ] Optionally: Add a simple "architecture fitness" script or just rely on docs + review.

**Effect**: Future AI (or human) work has strong guardrails. "Just generate a new feature" will be forced to follow the documented shape.

## 6. Effort & Sequencing Notes

- P0 can (and should) be done immediately after clone verification.
- P1 gates give the biggest "slop prevention" ROI per hour.
- P2 can be done opportunistically when touching files (e.g. "I'm editing Settings page → convert it to runes + add a small test").
- P3 docs pay dividends the moment you (or an agent) start larger refactors or new major features (e.g. "live price alerts", "multi-league support", "PoE2 full parity", "better bulk tools").
- Total for P0+P1 base: ~1-2 person-weeks if focused. Spread across PRs if solo.

## 7. Open Questions / Decisions for You

- How aggressive on WXT/Svelte updates vs. stability for the published extension?
- Full PoE2 feature parity a priority, or keep "PoE1-first with graceful skips"?
- Upstream contribution strategy (many changes via this fork first)?
- Language for new docs (English as lingua franca for agents + international contributors, plus DE/ES as needed)?
- Willing to accept some residual dev-dep vulns from WXT (common in extension tooling) or invest in alternatives?

## Next Actions (suggested)

1. Review this plan.
2. Execute Phase 0 (I can do the mechanical parts: git cleanup, README fix, script additions, file creation).
3. Decide on P1 scope and start introducing ESLint + first tests.
4. Write the CONTEXT.md together (I can draft based on existing ARCHITECTURE + code).
5. Use the plan as living document — update it when decisions are made.

---

**Sources for this analysis** (all local):
- `package.json`, `wxt.config.ts`, `tsconfig.json`, `.prettierrc.mjs`, `svelte.config.mjs`
- `docs/ARCHITECTURE.md`, `GUIA-PR-Y-RELEASE.md`, `LAUNCH-FEATURES.md`
- `.github/workflows/*.yml`
- Core services: `bookmarks.ts`, `item-results.ts`, `poe-ninja.ts`, `bulk-sellers.ts`, `storage.ts`, `settings.ts`, `background.ts`
- Entrypoints & contents: `trade-sidebar.content.ts`, `contents/index.svelte`, `contents/filter-panel.ts`
- Git inspection + `npm audit` + `npm outdated` + directory/grep scans.

This gives us a solid, evidence-based foundation. Let's discuss which piece to tackle first.

---

## Created GitHub Issues (as of 2026-06-12)

Issues have been created on https://github.com/luxus/poetrade (now that Issues are enabled).

All are organized under the parent tracking issue using GitHub sub-issues.

### Parent
- **#1** — [Track: Modernization & Anti-AI-Slop Initiative (Phased Plan)](https://github.com/luxus/poetrade/issues/1)  
  Labels: `modernization`, `anti-slop`

### Key Child Issues (sub-issues of #1)
- **#2** — [Add strict AGENTS.md with anti-AI-slop rules and make it mandatory for all changes](https://github.com/luxus/poetrade/issues/2)  
  **Highest priority** — done as one of the very first actions. Labels: `modernization`, `anti-slop`, `documentation`, `P0`

- **#3** — [P0: Hygiene & Safety — remove committed artifacts, harden gitignore, fix README, add typecheck](https://github.com/luxus/poetrade/issues/3)  
  Labels: `modernization`, `P0`, `security`

- **#4** — [P1: Add ESLint (strict) + run lint + typecheck + build on every PR](https://github.com/luxus/poetrade/issues/4)  
  Labels: `modernization`, `anti-slop`, `quality-gates`, `P1`

- **#5** — [P1: Add Vitest + initial high-value unit tests (bookmarks, utilities, storage)](https://github.com/luxus/poetrade/issues/5)  
  Labels: `modernization`, `anti-slop`, `quality-gates`, `P1`

- **#6** — [Create CONTEXT.md + seed docs/adr/ with first decisions](https://github.com/luxus/poetrade/issues/6)  
  Labels: `modernization`, `anti-slop`, `documentation`, `P1`

- **#7** — [P0/P1: Security follow-up — npm audit, remaining vulns, add audit to CI](https://github.com/luxus/poetrade/issues/7)  
  Labels: `modernization`, `anti-slop`, `security`, `P0`

These match the vertical-slice / tracer-bullet approach (each is a narrow, complete, verifiable piece of work).

The previous long "Prepared Drafts" content has been replaced by the live issues above. The detailed acceptance criteria are in the individual GitHub issues (or were based on the earlier drafts in this file).

All reference AGENTS.md and this plan.

Next work should generally start with #2 (commit AGENTS.md) + #3 (P0 hygiene) before opening bigger P1 work.

I can help with:
- Creating a branch and committing the local `AGENTS.md` + plan updates
- Implementing specific issues (e.g. start on #3 hygiene changes)
- Adding comments, assignees, or further sub-issues
- Drafting PRs against these issues

Just point me at an issue number or phase.

### Issue 1: Parent / Tracking
**Title**: Track: Modernization & Anti-AI-Slop Initiative (Phased Plan)

**Body**:
```
**Parent tracking issue** for the full modernization and anti-AI-slop effort.

See the detailed plan document: `docs/MODERNIZATION-AND-ANTI-SLOP-PLAN.md`.

## Goals
- Modernize the tech stack, tooling, and code quality
- Fix security/hygiene issues (npm audit, committed artifacts, etc.)
- Add strong, enforceable guardrails **from the very beginning** so that expanding the project does **not** introduce AI slop

## Key Early Deliverable
**AGENTS.md** with strict rules against AI slop has already been created locally as one of the absolute first actions. It must be committed early and referenced in all processes / PR templates.

## Phases (high level)
**P0 Hygiene & Safety** (start here)
- Clean committed build artifacts + harden .gitignore
- npm audit + CI step
- README reality check (Svelte 5)
- Add typecheck script
- Commit AGENTS.md + this plan

**P1 Quality Gates** (highest leverage against slop)
- Strict ESLint + TS rules in CI
- Vitest for services (bookmarks versioning is a great first test target)
- Full PR CI (typecheck, lint, test, build)
- Dependabot + anti-slop PR template

**P2 Code Modernization**
- Svelte 5 runes adoption
- Site adapter extraction (for the fragile filter-panel / observer code)
- PoE2 parity + type tightening

**P3 Permanent Defenses**
- CONTEXT.md + docs/adr/
- Process updates that reference AGENTS.md as mandatory

See full details and anti-slop assessment in the plan file.

**AGENTS.md** (root) now defines the rules. All future work (AI or human) must follow it.

**Blocked by**: None
```

**Labels**: `modernization`, `anti-slop`

---

### Issue 2: AGENTS.md (Priority — one of the very first things)
**Title**: Add strict AGENTS.md with anti-AI-slop rules and make it mandatory for all changes

**Body**:
```
## What to build
Introduce (and commit) a root `AGENTS.md` that defines non-negotiable, strict rules for agents, AI assistants, and human contributors. The file must emphasize quality gates, documentation requirements, architecture adherence, vertical slices, and special discipline around the fragile content-script / Vue-hack areas.

The initial version has already been created locally during the analysis phase (see AGENTS.md in the working tree).

## Acceptance criteria
- [ ] AGENTS.md exists at repo root with clear sections: Core Principles, Rules by Area (especially content scripts), Definition of Done, How to use with AI, Enforcement.
- [ ] It explicitly calls out that new logic in lib/services requires tests, that DOM/selector work must be centralized, no uncontrolled `any`, docs updates required, PoE1+PoE2 verification, etc.
- [ ] AGENTS.md is referenced from the modernization plan, from a future PR template, and (later) from CONTRIBUTING or README.
- [ ] The file is committed early (as one of the first deliverables of this initiative).
- [ ] Future PRs that touch logic or integration are expected to acknowledge the rules.

## Blocked by
None — this was intentionally done as one of the absolute first steps.

Reference: docs/MODERNIZATION-AND-ANTI-SLOP-PLAN.md (Anti-AI-Slop section + Phase 0/3)
```

**Labels**: `modernization`, `anti-slop`, `documentation`, `P0`

---

### Issue 3: P0 Hygiene
**Title**: P0: Hygiene & Safety — remove committed artifacts, harden gitignore, fix README, add typecheck

**Body**:
```
## What to build
Perform the quick-win hygiene items from Phase 0 so the repo is clean before we add gates and larger changes.

## Acceptance criteria
- [ ] `git rm --cached` (and clean) tsconfig.tsbuildinfo + tmp_video_frames/ (or properly ignore and filter history if desired)
- [ ] .gitignore extended for `tsconfig*.tsbuildinfo`, `tmp*/`, other build noise
- [ ] README.md Tech Stack section updated (Svelte 5, current WXT/TS versions, no "Svelte 4")
- [ ] `package.json` gains a `typecheck` script (`tsc --noEmit`)
- [ ] `npm run build` succeeds cleanly after changes
- [ ] AGENTS.md and the plan doc are part of the same early hygiene PR / branch where appropriate
- [ ] (Optional) first `npm audit fix` run + note on remaining transitive issues

## Blocked by
AGENTS.md creation (for process)

Reference the full list in Phase 0 of the plan.
```

**Labels**: `modernization`, `P0`, `security`

---

### Issue 4: P1 ESLint + CI Gates
**Title**: P1: Add ESLint (strict) + run lint + typecheck + build on every PR

**Body**:
```
## What to build
Introduce ESLint with typescript-eslint (recommended-type-checked) and Svelte rules. Wire it so that PRs cannot merge without clean lint + typecheck + build. This is a core defense against slop.

## Acceptance criteria
- [ ] ESLint flat config added (dev dep)
- [ ] Strict rules enabled: no-explicit-any (with documented exception allowlist only for contents/filter-panel.ts and similar), consistent returns, etc.
- [ ] `package.json` scripts: `lint`, `lint:fix`, `typecheck`
- [ ] `.github/workflows/` updated (or new ci.yml) that runs on PRs/push to main: install, lint, typecheck, build (chrome + firefox)
- [ ] AGENTS.md updated to reference the new gates
- [ ] Existing code either passes or has a tracked follow-up for the worst `any` / console usage

## Blocked by
P0 hygiene (clean baseline)

This is one of the highest-ROI changes for preventing AI slop.
```

**Labels**: `modernization`, `anti-slop`, `quality-gates`, `P1`

---

### Issue 5: P1 Tests (Vitest)
**Title**: P1: Add Vitest + initial high-value unit tests (bookmarks, utilities, storage)

**Body**:
```
## What to build
Add Vitest and write the first real tests. Focus on pure / service logic that AI changes are most likely to get wrong (serialization, versioning, reordering, caching, normalization).

## Acceptance criteria
- [ ] Vitest installed + `test` script + basic config (no DOM needed for first batch)
- [ ] Tests for `lib/services/bookmarks.ts` — at minimum: serialize/deserialize roundtrips for export versions 1-4, folder/trade CRUD, archive, reorder/move logic, deduping
- [ ] Tests for key utilities: slugify, escape-regex, trade-url, unique-id, date-delta
- [ ] Basic coverage for storage expiration + settings load/save
- [ ] Tests run in CI (from the ESLint+CI gates issue)
- [ ] AGENTS.md states that new service/utility logic requires tests

## Blocked by
P0 (for baseline), ideally alongside or after ESLint+CI so the gates exist

Vertical slice: a complete "add test infrastructure + protect the most slop-prone data layer" .
```

**Labels**: `modernization`, `anti-slop`, `quality-gates`, `P1`

---

### Issue 6: CONTEXT + ADRs (Phase 3, but start early)
**Title**: Create CONTEXT.md + seed docs/adr/ with first decisions

**Body**:
```
## What to build
Create the living project memory documents that make it hard for future AI (or humans) to invent contradictory approaches.

## Acceptance criteria
- [ ] `CONTEXT.md` at root with: mission, key domain concepts (TradeSiteVersion, folders vs trades, active-tab coordination, ephemeral poe.ninja cache, "finer filters" as main-world Vue injection), hard constraints (no remote data, must survive site DOM churn + Vue internals, MV3 limits, Chrome+Firefox parity), non-goals.
- [ ] `docs/adr/` directory + 3-5 lightweight ADRs (use a simple template):
  - Why WXT + integrated UI
  - Data versioning strategy (bookmarks export)
  - Background proxy for external APIs
  - Observer + DOM enhancement approach + risks
  - Current service state (stores) + runes migration plan
- [ ] ARCHITECTURE.md updated with "Maintenance hotspots" and "How to extend without creating slop" pointers to AGENTS.md and CONTEXT.
- [ ] AGENTS.md references these files as mandatory reading.

## Blocked by
Can start in parallel with P1 once the initial AGENTS.md + plan are in place.

High leverage for long-term anti-slop.
```

**Labels**: `modernization`, `anti-slop`, `documentation`, `P1`

---

### Additional suggested slices (later)
- Extract site-adapter layer for selectors (big maintainability + slop win)
- Security follow-up: lock down remaining audit issues + add production audit check
- PR template + CONTRIBUTING updates that hard-require the AGENTS checklist
- PoE2 equivalent pricing completion + tests

Copy these bodies, create the issues (after enabling), and we can then use sub-issues or cross-links for dependency tracking.

Once issues exist I can also help assign, add comments, or spawn sub-agents against specific issue numbers.
```

This section gives you ready-to-use material even while the tracker is disabled.
