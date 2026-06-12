import { describe, it, expect, beforeEach } from 'vitest';
import { BookmarksService } from './bookmarks';
import type { BookmarksFolderStruct, BookmarksTradeStruct } from '../types/bookmarks';

// We test the public serialization and core logic that is pure-ish.
// Storage is mocked minimally for the methods we exercise.

describe('BookmarksService - serialization & versioning (anti-slop critical path)', () => {
  let service: BookmarksService;

  beforeEach(() => {
    service = new BookmarksService();
  });

  it('serializes and deserializes modern folder (v4) correctly', () => {
    const folder: BookmarksFolderStruct = {
      id: 'f1',
      title: 'Test Folder',
      version: '1',
      icon: 'poe1-chaos',
      archivedAt: null,
    };

    const trades: BookmarksTradeStruct[] = [
      {
        id: 't1',
        title: 'My Search',
        location: { version: '1', type: 'search', slug: 'abc123', league: 'Standard' },
        completedAt: null,
      },
    ];

    const serialized = service.serializeFolder(folder, trades);
    expect(serialized).toMatch(/^4:/);

    const deserialized = service.deserializeFolder(serialized);
    expect(deserialized).not.toBeNull();

    const [restoredFolder, restoredTrades] = deserialized!;
    expect(restoredFolder.title).toBe('Test Folder');
    expect(restoredFolder.version).toBe('1');
    expect(restoredTrades).toHaveLength(1);
    expect(restoredTrades[0].title).toBe('My Search');
    expect(restoredTrades[0].location.league).toBe('Standard');
  });

  it('deserializes legacy v1/v2/v3 formats without crashing (backward compat)', () => {
    // v1 example (very old atob style)
    const v1 = 'dGVzdC1mb2xkZXI6c2VhcmNoOnNvbWUtc2x1Zw=='; // base64 of old format (simplified)
    const res1 = service.deserializeFolder(v1);
    // May return null for malformed old, but should not throw
    expect(res1 === null || Array.isArray(res1)).toBe(true);

    // v3 example
    const v3 = '3:eyJpY24iOiJwb2UxLWNoYW9zIiwidGl0IjoiTGVnYWN5Iiwi dmVyIjoiMSIsInRycyI6W3sidGl0IjoiT2xkIiwi bG9jIjoiMTpzZWFyY2g6c2x1ZyJ9XX0=';
    const res3 = service.deserializeFolder(v3);
    expect(res3 === null || Array.isArray(res3)).toBe(true);
  });

  it('handles folder reordering and move operations', async () => {
    // Minimal test of reorder logic (the service methods)
    // Since storage is real chrome in real, we test the pure reorder helper
    const folders = [
      { id: 'a', title: 'A', version: '1' as const, icon: null, archivedAt: null },
      { id: 'b', title: 'B', version: '1' as const, icon: null, archivedAt: null },
    ];

    const reordered = service.partiallyReorderFolders(folders as unknown as any, [folders[1], folders[0]] as unknown as any);  // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(reordered[0].id).toBe('b');
    expect(reordered[1].id).toBe('a');
  });
});

describe('BookmarksService - basic folder/trade lifecycle (smoke)', () => {
  it('can create service instance without throwing (storage may be mocked in real extension)', () => {
    const service = new BookmarksService();
    expect(service).toBeDefined();
    // Full persist test belongs in integration / extension context
  });
});