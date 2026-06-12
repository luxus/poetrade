/**
 * PoE1 Strategy for site integration.
 * Contains the current (encapsulated) implementation that delivers the "magic"
 * instant filter add UX using the site's Vue internals.
 */
import { ISiteStrategy } from './site-strategy';
import { MOD_SELECTORS, attachFilterButtonsToMod, prepareModForButtons } from './mod-decoration';
import { STAT_HASH_MAP } from './stat-hash-map';
import {
  addStatFromResultRow,
  addStatToFilterGroup,
  applyGlobalPresetViaVue,
  getItemSearchGroups,
  getTradeApp,
  isStatInGroupsOfType,
  removeStatFromAllGroups,
} from './vue-filter-helpers';

export class PoE1SiteStrategy implements ISiteStrategy {
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
      mod.classList.remove('finer-filtered', 'finer-filterable', 'finer-in-and', 'finer-in-not');
      mod.classList.add('finer-filterable');
      return;
    }

    const inAnd = isStatInGroupsOfType(hash, 'and');
    const inNot = isStatInGroupsOfType(hash, 'not');
    mod.classList.remove('finer-filtered', 'finer-filterable', 'finer-in-and', 'finer-in-not');
    if (inAnd) mod.classList.add('finer-in-and');
    if (inNot) mod.classList.add('finer-in-not');
    if (inAnd || inNot) mod.classList.add('finer-filtered');
    if (!inAnd || !inNot) mod.classList.add('finer-filterable');
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
    try {
      if (rowId && addStatFromResultRow(hash, mode, rowId)) return true;
      return addStatToFilterGroup(hash, mode);
    } catch (err) {
      console.error('[PoE1Strategy] addStatFilter failed', err);
      return false;
    }
  }

  async removeStatFilter(hash: string): Promise<boolean> {
    try {
      return removeStatFromAllGroups(hash);
    } catch (err) {
      console.error('[PoE1Strategy] removeStatFilter failed', err);
      return false;
    }
  }

  async applyGlobalPresetAction(types: string[], prefix: string, isAdd: boolean): Promise<void> {
    if (!applyGlobalPresetViaVue(types, prefix, isAdd, (key) => this.getStatHashForKey(key))) {
      console.warn('[PoE1Strategy] global preset action failed — window.app or AND filter group unavailable');
    }
  }

  isMagicSupported(): boolean {
    return this.hasSiteApp();
  }

  getCurrentFilterGroups(_type?: string): unknown[] {
    return getItemSearchGroups(_type);
  }
}