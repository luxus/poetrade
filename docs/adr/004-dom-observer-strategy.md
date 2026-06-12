# ADR-004: DOM Observers + Result Enhancement Strategy

**Date**: 2026-06-12

**Status**: Accepted

## Context
The trade site recycles DOM nodes heavily between searches. We need to inject pricing equivalents, stat highlights, socket warnings, bulk seller groups, etc. in a reliable way.

## Decision
Use MutationObserver on the results container + scheduled re-enhance on search button clicks + explicit `bt-enhanced` attributes to avoid double processing. All selector logic should eventually live in a site-adapter layer.

## Consequences
- Works today despite site churn.
- Very sensitive to site changes (see filter-panel and item-results hotspots in CONTEXT.md).
- Future work: extract a `lib/site-adapter/` with versioned selector maps + last-verified comments.
- Heavy use of this pattern is why content-script changes require manual live verification on PoE1 + PoE2.

Per AGENTS.md: never add "just one more querySelector" without considering the adapter.