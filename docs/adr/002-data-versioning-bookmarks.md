# ADR-002: Export / Data Versioning for Bookmarks

**Date**: 2026-06-12

**Status**: Accepted

## Context
Users export and import folders as backup / share strings. The format has evolved (league support, PoE2 versions, icons, etc.).

## Decision
Use a version prefix (e.g. `4:base64json`) + explicit version field inside. Keep full deserialization logic for v1–v4 in `bookmarks.ts`. New formats must increment the version and keep old paths working.

## Consequences
- Users never lose old backups.
- Adding fields (e.g. PoE2 support in v4) is safe.
- The serialization code is now one of the most important pieces to test (see bookmarks.test.ts).
- Any change to folder/trade shape must consider the export path.

This is a core anti-slop rule per AGENTS.md.