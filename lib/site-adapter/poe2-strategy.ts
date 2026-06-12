import { ISiteStrategy } from './site-strategy';
import { MOD_SELECTORS, attachFilterButtonsToMod, prepareModForButtons } from './mod-decoration';
import { STAT_HASH_MAP } from './stat-hash-map';
import {
  addStatFromResultRow,
  addStatToFilterGroup,
  applyGlobalPresetViaVue,
  getItemSearchGroups,
  getTradeApp,
  isStatInFilterGroups,
  removeStatFromAllGroups,
} from './vue-filter-helpers';

/**
 * PoE2 Strategy.
 * Primary: Vue filter mutation when window.app is present (same trade UI stack as PoE1).
 * Fallback: DOM scrape for "already filtered" state; graceful no-op if site internals unavailable.
 */
export class PoE2SiteStrategy implements ISiteStrategy {
  getModSelectors(): string {
    return MOD_SELECTORS;
  }

  getStatHashForKey(key: string): string | undefined {
    return STAT_HASH_MAP[key];
  }

  hasSiteApp(): boolean {
    return !!getTradeApp();
  }

  getRowId(mod: HTMLElement): string {
    const row = mod.closest('[data-id]') as HTMLElement | null;
    return row?.getAttribute('data-id') || row?.id || mod.dataset.rowid || '';
  }

  prepareModForButtons(mod: HTMLElement): void {
    prepareModForButtons(mod);
  }

  decorateModForFiner(mod: HTMLElement): void {
    const hash = mod.dataset.hash;
    if (!hash) {
      mod.classList.add('finer-filterable');
      return;
    }

    const isFiltered = this.hasSiteApp()
      ? isStatInFilterGroups(hash)
      : this.getScrapedActiveFilters().some((f) => f.id === hash);

    mod.classList.remove('finer-filtered', 'finer-filterable');
    mod.classList.add(isFiltered ? 'finer-filtered' : 'finer-filterable');
  }

  prepareAndDecorateModForFinerButtons(mod: HTMLElement): void {
    this.prepareModForButtons(mod);
    this.decorateModForFiner(mod);
  }

  attachFilterButtons(mod: HTMLElement, buttonsElement: HTMLElement): void {
    attachFilterButtonsToMod(mod, buttonsElement);
  }

  scanVisibleMods(root: ParentNode = document): void {
    Array.from(root.querySelectorAll(this.getModSelectors()) as NodeListOf<HTMLElement>).forEach(
      (mod) => this.prepareAndDecorateModForFinerButtons(mod),
    );
  }

  async addStatFilter(
    hash: string,
    mode: 'include' | 'exclude' = 'include',
    rowId?: string,
  ): Promise<boolean> {
    if (this.hasSiteApp()) {
      if (addStatFromResultRow(hash, mode, rowId)) return true;
      return addStatToFilterGroup(hash, mode);
    }
    console.warn('[PoE2Strategy] window.app unavailable — cannot add stat filter');
    return false;
  }

  async removeStatFilter(hash: string): Promise<boolean> {
    if (this.hasSiteApp()) return removeStatFromAllGroups(hash);
    console.warn('[PoE2Strategy] window.app unavailable — cannot remove stat filter');
    return false;
  }

  async applyGlobalPresetAction(types: string[], prefix: string, isAdd: boolean): Promise<void> {
    if (!this.hasSiteApp()) {
      console.warn('[PoE2Strategy] window.app unavailable — global presets require site app');
      return;
    }
    applyGlobalPresetViaVue(types, prefix, isAdd, (key) => this.getStatHashForKey(key));
  }

  isMagicSupported(): boolean {
    return this.hasSiteApp();
  }

  getCurrentFilterGroups(_type?: string): unknown[] {
    if (this.hasSiteApp()) return getItemSearchGroups(_type);
    return this.getScrapedActiveFilters();
  }

  private getScrapedActiveFilters(): Array<{ id: string; text: string }> {
    const active: Array<{ id: string; text: string }> = [];
    document
      .querySelectorAll(
        '.filter-list .filter, .search-advanced .filter, [class*="active-filter"], .stat-filter-group .filter-title',
      )
      .forEach((el) => {
        const text = (el.textContent || '').trim().toLowerCase();
        const htmlEl = el as HTMLElement;
        const dataId = htmlEl.dataset?.id || htmlEl.dataset?.hash || '';
        if (text || dataId) active.push({ id: dataId || text, text });
      });
    return active;
  }
}