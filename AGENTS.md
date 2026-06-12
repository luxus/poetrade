# AGENTS.md — Poe Trade Plus

**Strict rules for all agents, AI assistants, contributors, and humans working on this codebase.**

The primary goal of this project is **high-quality, maintainable code that resists "AI slop"** (low-effort, plausible-looking, but brittle, untested, undocumented, or architecturally inconsistent changes). We are modernizing the extension while adding strong guardrails from the beginning.

This file takes precedence for any AI-driven or assisted work. Follow it **strictly**. Violations will be rejected in review.

## 0. Read This First (Mandatory)

- Read and internalize:
  - [docs/MODERNIZATION-AND-ANTI-SLOP-PLAN.md](docs/MODERNIZATION-AND-ANTI-SLOP-PLAN.md)
  - [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
  - This AGENTS.md
- Once created: `CONTEXT.md` (domain language, constraints, non-goals) and `docs/adr/` become mandatory reading.
- Never start work without understanding the existing service boundaries, the fragility of content-script/DOM integrations, PoE1 vs PoE2 differences, and MV3 + local-storage constraints.

## 1. Core Anti-Slop Principles (Non-Negotiable)

1. **Quality over speed**. A smaller correct, tested, documented change beats a large "feature-complete" slop change.
2. **Vertical slices only**. Changes must be narrow end-to-end slices (see to-issues skill / tracer bullets). No big horizontal refactors in one PR unless explicitly approved as a planned epic.
3. **Gates must pass**. Code must pass:
   - `npm run typecheck`
   - `npm run lint` (once added)
   - `npm test` (once added)
   - `npm run build` (both browsers)
4. **No silent breakage**. PoE trade site is fragile. Any change touching selectors, observers, Vue hooks, or result rendering **must** be verified against current PoE1 and PoE2 trade pages.
5. **Documentation is part of the work**. If the change affects architecture, data model, integration points, or maintenance hotspots — update the relevant docs **in the same PR**.
6. **Defensive against future AI work**. Every change should make the next change harder to do sloppily (better types, adapters, tests, docs).

## 2. Strict Rules by Area

### General Code Changes
- Follow existing patterns:
  - Services are classes with clear public API + internal normalization (see `bookmarks.ts`, `item-results.ts`, `poe-ninja.ts`).
  - Use Svelte stores for cross-component reactive state in services; prefer Svelte 5 runes (`$state`, `$derived`, `$effect`) for new/local component state.
  - Types live in `lib/types/`. Keep them version-aware where data is persisted/serialized.
- **No new top-level `any`** in `lib/` (services, utilities, types). In `contents/` and filter hacks, `any` is sometimes unavoidable for site internals — isolate it, document the assumed shape with a comment, and add a TODO for future tightening.
- Prefer composition and small pure utilities over god objects or duplicated logic.
- All new persistent data (storage keys, export formats, settings) **must** be versioned or have a clear migration path.
- Error handling: Use existing patterns (graceful fallbacks, context-invalidated checks via `extension-context.ts`, debug via `page-debug.ts`). Never let unhandled promises or silent `catch {}` hide real problems.
- Logging: Use tagged `console.*` or `emitPageDebug` only. Make debug output conditional where possible.

### Content Scripts & Site Integration (Highest Slop Risk Area)
- **All site interaction must go through the adapter** (see ADR-005). `lib/site-adapter/` is the single place allowed to contain DOM queries, event simulation, or framework poking (Vue internals on the PoE site).
- No new direct `window.app`, `$children`, `$vnode`, or raw Vue traversal outside the adapter. This is strictly enforced.
- Finer Filters (the "instant add filter from results" magic) is a non-negotiable feature. The adapter must preserve the exact current UX quality ("zauber" feel) for PoE1. No regression allowed.
- The current deep Vue poking is acknowledged technical debt. It lives only inside the adapter as a last-resort strategy for the magic UX. We are committed to reducing reliance on it over time (cleaner DOM simulation preferred).
- Always handle PoE1 vs PoE2 explicitly. PoE2 is now the primary focus.
- Any change touching the adapter requires manual verification on live PoE1 **and** PoE2 trade pages.
- See ADR-005 for the full strategy and migration plan.

### Tests (Will be mandatory after Phase 1)
- New logic in `lib/services/`, `lib/utilities/`, or pure data handling **requires** accompanying unit tests (Vitest).
- DOM-heavy / observer code can start with contract + integration tests or manual verification notes.
- Tests must be fast, deterministic, and cover edge cases (serialization versions, cache expiration, league filtering, reorder/move logic, etc.).
- Run tests locally before pushing.

### Documentation & Project Memory
- Update `docs/ARCHITECTURE.md` for any cross-cutting change, new service, or change to messaging/flow.
- After `CONTEXT.md` and `docs/adr/` exist: 
  - New major decisions must have a lightweight ADR.
  - Use domain vocabulary exactly as defined in CONTEXT.md.
- Every feature PR must update the relevant section of `LAUNCH-FEATURES.md` (or equivalent) if user-visible.
- Keep README in sync (tech stack, dev commands, permissions).

### Commits, PRs, and Process
- Follow the existing PR workflow in `docs/GUIA-PR-Y-RELEASE.md`.
- Commit messages: conventional style, clear and scoped (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
- PRs must include:
  - Description of the vertical slice.
  - Evidence that gates passed.
  - Manual verification notes for content-script changes (screenshots or "tested on PoE1 trade + PoE2 trade").
  - Links to updated docs/ADRs.
- Small, reviewable PRs preferred. Large PRs will be asked to be split.
- When using AI assistance for a PR: the human is fully responsible for the final quality. Do not push AI output that you have not rigorously reviewed against these rules.

### Dependencies & Tooling
- Prefer updates that are low-risk and justified. Run `npm audit` considerations.
- New dev dependencies must be approved via discussion (they affect the build chain and supply-chain risk).
- Do not commit `node_modules/`, build artifacts, `*.tsbuildinfo`, `tmp*/`, or keys.

### Security & Privacy
- Never introduce new host permissions, storage of user data remotely, or privileged APIs unless explicitly required and reviewed.
- All network access goes through the controlled background proxy pattern (or fetch in isolated content script to our allowed hosts only).
- Local storage only. Respect existing key naming and league/TTL patterns.

## 3. What "Done" Looks Like (Definition of Done for AI-assisted changes)

Before a change is considered complete:

- [ ] Follows existing architecture and service patterns (or has an approved exception + ADR).
- [ ] Passes typecheck, lint, tests, and clean build.
- [ ] Has tests for all new non-DOM logic (or explicit justification + plan to add).
- [ ] Updates documentation (ARCHITECTURE, this AGENTS.md if rules changed, CONTEXT/ADR as applicable).
- [ ] Content script / selector changes manually verified on both PoE1 and PoE2 trade.
- [ ] No new un-isolated `any`, no new fragile top-level selectors, no unversioned data formats.
- [ ] PR description + manual test notes included.
- [ ] The change makes future similar work *easier* or at least not harder (extracted adapter, better type, test helper, etc.).

## 4. How to Use This With AI / Grok / Agents

- Paste or reference this file + the modernization plan at the start of any task.
- Prefer the `to-issues` process (tracer-bullet vertical slices) for breaking down work.
- When the agent proposes code: the response must explicitly call out how it satisfies the rules above.
- If a task would violate a rule (e.g. "add a quick hack in filter-panel"), the agent **must** flag it and propose the proper (more work) approach or ask for an exception.
- For large modernization work: follow the 4-phase plan in priority order (hygiene & gates first).

## 5. Enforcement

- These rules are enforced in code review and CI (as gates are added).
- Repeated or egregious violations by AI output will result in the contributing human being asked to redo the work manually or the PR being closed.
- This file can only be changed with a PR that explicitly updates the anti-slop intent and is reviewed.

**Remember**: The entire point of the modernization effort is to make this codebase *more* resistant to low-quality additions over time — not less. Strict rules now prevent technical debt and slop later.

If in doubt, ask before implementing. Better a clarifying question than a sloppy change.

---

*This AGENTS.md was created as one of the very first deliverables of the modernization effort (see parent tracking issue).*
