/**
 * Encapsulated Vue internals for trade-site filter mutation.
 * Used by PoE1 (primary) and PoE2 (when window.app is present — same trade UI stack).
 * All poking lives here per ADR-005.
 */

export interface SiteFilter {
  id: string;
  value: Record<string, unknown>;
  disabled: boolean;
}

interface VueComponent {
  $children?: VueComponent[];
  $vnode?: { tag?: string; key?: string };
  $store?: { commit: (name: string, payload: unknown) => void };
  translate?: (key: string) => string;
  itemId?: string;
  group?: { type: string };
  index?: number;
  filters?: SiteFilter[];
  state?: { filters: Array<{ value?: { min?: number; max?: number | null } }> };
  selectFilter?: (filter: SiteFilter) => void;
  updateFilter?: (index: number, patch: Record<string, unknown>) => void;
  removeFilter?: (index: number) => void;
  search?: () => void;
}

interface TradeApp {
  save: (reload?: boolean) => void;
  $refs?: { toastr?: { Add: (opts: { msg: string; progressbar: boolean; timeout: number }) => void } };
}

function finder(vm: VueComponent | undefined, tag: string): boolean {
  return vm?.$vnode?.tag?.includes?.(tag) ?? false;
}

function readSiteApp<T>(): T | undefined {
  return (globalThis as unknown as { app?: T }).app;
}

export function getTradeApp(): TradeApp | null {
  const app = readSiteApp<TradeApp>();
  return app?.save ? app : null;
}

function findVueItem(tags: string[]): VueComponent | undefined {
  return tags.reduce<VueComponent | undefined>(
    (acc, tag) => acc?.$children?.find((child) => finder(child, tag)),
    readSiteApp<VueComponent>(),
  );
}

export function getItemSearchGroups(type?: string): VueComponent[] {
  const panel = findVueItem(['item-search-panel', 'item-filter-panel']);
  return (
    panel?.$children?.filter(
      (child) => finder(child, 'stat-filter-group') && (type ? child.group?.type === type : true),
    ) ?? []
  );
}

function findVueResultItem(itemId?: string): VueComponent | undefined {
  const resultset = findVueItem(['item-results-panel', 'resultset']);
  if (!itemId) return undefined;
  return resultset?.$children?.find((child) => child.itemId === itemId);
}

function getItemResultsPanel(): VueComponent | undefined {
  return findVueItem(['item-results-panel']);
}

export function createSiteFilter(id: string): SiteFilter | null {
  return id ? { id, value: {}, disabled: false } : null;
}

export function isStatInFilterGroups(hash: string, groups?: VueComponent[]): boolean {
  const ISGs = groups ?? getItemSearchGroups();
  return ISGs.some((group) => group.filters?.some((filter) => filter.id === hash) ?? false);
}

/** PoE1-style: push into the primary stat-filter group and save. */
export function addStatToFilterGroup(
  hash: string,
  mode: 'include' | 'exclude' = 'include',
): boolean {
  const app = getTradeApp();
  if (!app) return false;

  const filterType = mode === 'exclude' ? 'not' : 'and';
  const ISGs = getItemSearchGroups(filterType);
  const targetGroup = ISGs.find((g) => g.index === 0) ?? ISGs[0];
  if (!targetGroup?.filters) return false;

  if (targetGroup.filters.some((f) => f.id === hash)) return true;

  const newFilter = createSiteFilter(hash);
  if (!newFilter) return false;

  targetGroup.filters.push(newFilter);
  app.save(true);
  return true;
}

/** Full magic UX from result +/- buttons: selectFilter or pushStatGroup + search(). */
export function addStatFromResultRow(
  hash: string,
  mode: 'include' | 'exclude',
  rowId?: string,
): boolean {
  const app = getTradeApp();
  if (!app) return false;

  const filterType = mode === 'include' ? 'and' : 'not';
  const newFilter = createSiteFilter(hash);
  if (!newFilter) return false;

  const ISGs = getItemSearchGroups(filterType);
  const targetGroup = ISGs.find((g) => g.index !== 0) ?? ISGs[0];

  if (targetGroup?.selectFilter) {
    targetGroup.selectFilter(newFilter);
  } else {
    const vueResult = findVueResultItem(rowId);
    vueResult?.$store?.commit?.('pushStatGroup', { type: filterType, filters: [newFilter] });
  }

  try {
    const vueResult = findVueResultItem(rowId);
    const msg = vueResult?.translate?.(
      `the stat ${hash} has been ${mode === 'include' ? 'added to' : 'removed from'} your stat filters.`,
    );
    if (msg) app.$refs?.toastr?.Add({ msg, progressbar: false, timeout: 3000 });
  } catch {
    // Toast is optional
  }

  app.save(true);
  getItemResultsPanel()?.search?.();
  return true;
}

export function removeStatFromAllGroups(hash: string): boolean {
  const app = getTradeApp();
  if (!app) return false;

  let removed = false;
  for (const group of getItemSearchGroups()) {
    if (!group.filters) continue;
    const before = group.filters.length;
    group.filters = group.filters.filter((f) => f.id !== hash);
    if (group.filters.length !== before) removed = true;
  }

  if (removed) app.save(true);
  return removed;
}

export function applyGlobalPresetViaVue(
  types: string[],
  prefix: string,
  isAdd: boolean,
  resolveHash: (key: string) => string | undefined,
): boolean {
  const app = getTradeApp();
  if (!app) return false;

  const ISG = getItemSearchGroups('and').find((g) => g.index === 0);
  if (!ISG?.filters || !ISG.selectFilter || !ISG.updateFilter || !ISG.removeFilter) return false;

  let reload = false;

  for (const key of types) {
    const reHashed = `${prefix}${resolveHash(key) ?? key}`;
    const current = ISG.filters.find((f) => f.id === reHashed);
    if (current) {
      const modIndex = ISG.filters.indexOf(current);
      const currentModValue = ISG.state?.filters?.[modIndex]?.value ?? {};
      const currentMin = currentModValue.min ?? 0;

      if (currentMin || isAdd) {
        ISG.updateFilter(modIndex, { min: currentMin + (isAdd ? 10 : -10) });
      } else {
        ISG.removeFilter(modIndex);
      }
      reload = true;
    } else if (isAdd) {
      const filter = createSiteFilter(reHashed);
      if (filter) {
        ISG.selectFilter(filter);
        reload = true;
      }
    }
  }

  if (reload) {
    app.save(true);
    document.querySelector<HTMLElement>('.btn.search-btn')?.click();
  }

  return reload;
}