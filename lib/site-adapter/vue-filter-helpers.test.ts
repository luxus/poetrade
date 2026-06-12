import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addStatFromResultRow,
  addStatToFilterGroup,
  applyGlobalPresetViaVue,
  createSiteFilter,
  findStatFilterGroup,
  getItemSearchGroups,
  getTradeApp,
  isStatInFilterGroups,
  isStatInGroupsOfType,
  removeStatFromAllGroups,
} from './vue-filter-helpers';
import { STAT_HASH_MAP } from './stat-hash-map';

type MockWindow = typeof globalThis & {
  app?: {
    save: ReturnType<typeof vi.fn>;
    $refs?: { toastr?: { Add: ReturnType<typeof vi.fn> } };
    $children?: unknown[];
  };
};

function tag(name: string) {
  return { tag: `vue-component-${name}` };
}

function installMockTradeApp() {
  const save = vi.fn();
  const search = vi.fn();
  const andFilters0: Array<{ id: string; value: Record<string, unknown>; disabled: boolean }> = [];
  const andFilters1: Array<{ id: string; value: Record<string, unknown>; disabled: boolean }> = [];
  const notFilters: Array<{ id: string; value: Record<string, unknown>; disabled: boolean }> = [];

  const makeGroup = (
    type: 'and' | 'not',
    index: number,
    filters: Array<{ id: string; value: Record<string, unknown>; disabled: boolean }>,
    extra?: Record<string, unknown>,
  ) => ({
    $vnode: tag('stat-filter-group'),
    group: { type },
    index,
    filters,
    selectFilter: vi.fn((filter: { id: string }) => {
      filters.push({ id: filter.id, value: {}, disabled: false });
    }),
    updateFilter: vi.fn(),
    removeFilter: vi.fn(),
    state: { filters: filters.map(() => ({ value: { min: 0 } })) },
    ...extra,
  });

  const andGroup0 = makeGroup('and', 0, andFilters0);
  const andGroup1 = makeGroup('and', 1, andFilters1);
  const notGroup1 = makeGroup('not', 1, notFilters, { index: 1 });

  const filterPanel = {
    $vnode: tag('item-filter-panel'),
    $children: [andGroup0, andGroup1, notGroup1],
  };

  const searchPanel = {
    $vnode: tag('item-search-panel'),
    $children: [filterPanel],
  };

  const resultsPanel = {
    $vnode: tag('item-results-panel'),
    $children: [
      {
        $vnode: tag('resultset'),
        $children: [
          {
            itemId: 'row-1',
            $store: { commit: vi.fn() },
            translate: (key: string) => key,
          },
        ],
      },
    ],
    search,
  };

  (globalThis as MockWindow).app = {
    save,
    $refs: { toastr: { Add: vi.fn() } },
    $children: [searchPanel, resultsPanel],
  };

  return { save, search, andFilters0, andFilters1, notFilters, andGroup0, andGroup1, notGroup1 };
}

afterEach(() => {
  delete (globalThis as MockWindow).app;
  vi.restoreAllMocks();
});

describe('vue-filter-helpers', () => {
  it('createSiteFilter returns null for empty id', () => {
    expect(createSiteFilter('')).toBeNull();
  });

  it('createSiteFilter builds a disabled-false filter object', () => {
    expect(createSiteFilter('total_life')).toEqual({
      id: 'total_life',
      value: {},
      disabled: false,
    });
  });

  it('getTradeApp returns app when save exists', () => {
    installMockTradeApp();
    expect(getTradeApp()?.save).toBeTypeOf('function');
  });

  it('getItemSearchGroups finds stat-filter-group children', () => {
    installMockTradeApp();
    const groups = getItemSearchGroups('and');
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.group?.type === 'and')).toBe(true);
  });

  it('isStatInFilterGroups detects active stat ids', () => {
    const { andFilters0 } = installMockTradeApp();
    andFilters0.push({ id: 'abc', value: {}, disabled: false });
    expect(isStatInFilterGroups('abc')).toBe(true);
    expect(isStatInFilterGroups('missing')).toBe(false);
  });

  it('addStatToFilterGroup pushes filter and saves', () => {
    const { save, andFilters1 } = installMockTradeApp();
    expect(addStatToFilterGroup('hash-1', 'include')).toBe(true);
    expect(andFilters1.some((f) => f.id === 'hash-1')).toBe(true);
    expect(save).toHaveBeenCalledWith(true);
  });

  it('addStatToFilterGroup is idempotent for existing hash', () => {
    const { save, andFilters1 } = installMockTradeApp();
    andFilters1.push({ id: 'dup', value: {}, disabled: false });
    expect(addStatToFilterGroup('dup', 'include')).toBe(true);
    expect(andFilters1.filter((f) => f.id === 'dup')).toHaveLength(1);
    expect(save).not.toHaveBeenCalled();
  });

  it('findStatFilterGroup prefers index !== 0', () => {
    installMockTradeApp();
    expect(findStatFilterGroup('and')?.index).toBe(1);
    expect(findStatFilterGroup('not')?.index).toBe(1);
  });

  it('addStatFromResultRow uses selectFilter and triggers search', () => {
    const { save, search, andGroup1 } = installMockTradeApp();
    expect(addStatFromResultRow('from-row', 'include', 'row-1')).toBe(true);
    expect(andGroup1.selectFilter).toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith(true);
    expect(search).toHaveBeenCalled();
  });

  it('addStatFromResultRow adds exclude stat to not group', () => {
    const { save, search, notGroup1 } = installMockTradeApp();
    expect(addStatFromResultRow('exclude-stat', 'exclude', 'row-1')).toBe(true);
    expect(notGroup1.selectFilter).toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith(true);
    expect(search).toHaveBeenCalled();
  });

  it('addStatFromResultRow exclude creates not group via pushStatGroup when missing', () => {
    const save = vi.fn();
    const search = vi.fn();
    const commit = vi.fn();
    const andFilters1: Array<{ id: string; value: Record<string, unknown>; disabled: boolean }> = [];
    const andGroup1 = {
      $vnode: tag('stat-filter-group'),
      group: { type: 'and' },
      index: 1,
      filters: andFilters1,
      selectFilter: vi.fn(),
    };
    const filterPanel = {
      $vnode: tag('item-filter-panel'),
      $children: [andGroup1],
    };
    const searchPanel = {
      $vnode: tag('item-search-panel'),
      $children: [filterPanel],
    };
    const resultsPanel = {
      $vnode: tag('item-results-panel'),
      $children: [
        {
          $vnode: tag('resultset'),
          $children: [
            {
              itemId: 'row-9',
              $store: { commit },
              translate: (key: string) => key,
            },
          ],
        },
      ],
      search,
    };
    (globalThis as MockWindow).app = {
      save,
      $refs: { toastr: { Add: vi.fn() } },
      $children: [searchPanel, resultsPanel],
    };

    expect(addStatFromResultRow('exclude-new', 'exclude', 'row-9')).toBe(true);
    expect(commit).toHaveBeenCalledWith('pushStatGroup', {
      type: 'not',
      filters: [{ id: 'exclude-new', value: {}, disabled: false }],
    });
    expect(save).toHaveBeenCalledWith(true);
    expect(search).toHaveBeenCalled();
  });

  it('addStatFromResultRow is idempotent when stat already in target group', () => {
    const { save, search, andFilters1 } = installMockTradeApp();
    andFilters1.push({ id: 'dup-stat', value: {}, disabled: false });
    expect(addStatFromResultRow('dup-stat', 'include', 'row-1')).toBe(true);
    expect(save).not.toHaveBeenCalled();
    expect(search).not.toHaveBeenCalled();
  });

  it('isStatInGroupsOfType checks only matching filter type', () => {
    const { andFilters0, notFilters } = installMockTradeApp();
    andFilters0.push({ id: 'and-only', value: {}, disabled: false });
    notFilters.push({ id: 'not-only', value: {}, disabled: false });
    expect(isStatInGroupsOfType('and-only', 'and')).toBe(true);
    expect(isStatInGroupsOfType('and-only', 'not')).toBe(false);
    expect(isStatInGroupsOfType('not-only', 'not')).toBe(true);
  });

  it('removeStatFromAllGroups removes across groups', () => {
    const { save, andFilters0, andFilters1, notFilters, andGroup0, andGroup1, notGroup1 } =
      installMockTradeApp();
    andFilters0.push({ id: 'x', value: {}, disabled: false });
    andFilters1.push({ id: 'x', value: {}, disabled: false });
    notFilters.push({ id: 'x', value: {}, disabled: false });
    expect(removeStatFromAllGroups('x')).toBe(true);
    expect(andGroup0.filters).toHaveLength(0);
    expect(andGroup1.filters).toHaveLength(0);
    expect(notGroup1.filters).toHaveLength(0);
    expect(save).toHaveBeenCalledWith(true);
  });

  it('applyGlobalPresetViaVue adds preset stat on plus', () => {
    const { save, andGroup0 } = installMockTradeApp();
    const click = vi.fn();
    const querySelector = vi.fn().mockReturnValue({ click });
    vi.stubGlobal('document', { querySelector });

    const ok = applyGlobalPresetViaVue(['life'], 'pseudo.pseudo_', true, (key) => STAT_HASH_MAP[key]);
    expect(ok).toBe(true);
    expect(andGroup0.selectFilter).toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith(true);
    expect(click).toHaveBeenCalled();
  });
});

describe('stat-hash-map', () => {
  it('maps preset keys to known stat ids', () => {
    expect(STAT_HASH_MAP.life).toBe('total_life');
    expect(STAT_HASH_MAP.explicit_life).toBe('3299347043');
  });
});