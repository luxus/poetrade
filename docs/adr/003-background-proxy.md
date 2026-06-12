# ADR-003: Background Script as CORS Proxy

**Date**: 2026-06-12

**Status**: Accepted

## Context
Content scripts cannot freely call poe.ninja or the official trade exchange API due to CORS and the need for authenticated-like calls in some cases.

## Decision
Use a simple message-passing proxy in the background script (`background.ts`) for two query types: "poe-ninja" and "trade-exchange-rate". The background does the fetch and sendResponse.

## Consequences
- Keeps permissions minimal (no broad host access from content).
- Central place to add caching, logging, or future rate limiting.
- Easy to mock in tests.
- Adds a small surface for message handling bugs.

This pattern is preferred over direct fetch from content for our external dependencies.