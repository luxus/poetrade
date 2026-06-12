# ADR-001: WXT + Integrated UI Injection

**Date**: 2026-06-12

**Status**: Accepted

## Context
We need to inject a resizable, stateful sidebar + result enhancements into the live Path of Exile trade site while supporting both Chrome and Firefox MV3.

## Decision
Use WXT (with @wxt-dev/module-svelte) and `createIntegratedUi` to mount the Svelte app inline on the body of trade pages.

## Consequences
- Positive: Excellent dev experience, manifest v3 handling, multi-browser support, hot reload in dev.
- Positive: The sidebar feels native (resizable, position left/right, minimize).
- Negative: We are tightly coupled to the site's DOM for layout shift and enhancements.
- We accept the maintenance cost of content-script fragility in exchange for the best possible UX inside the official site.

See also: CONTEXT.md (Finer Filters hotspot), ARCHITECTURE.md.