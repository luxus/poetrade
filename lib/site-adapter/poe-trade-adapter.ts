/**
 * PoeTradeSiteAdapter - The elegant, central facade for all PoE trade site interaction.
 * 
 * Uses Strategy pattern (pure genius) for clean separation:
 * - PoE1Strategy: Encapsulates the current poking needed for perfect "magic" UX on PoE1.
 * - PoE2Strategy: Focus on clean DOM/event methods; evolves to full magic without hacks.
 * 
 * Callers (filter-panel, etc.) use only high-level API. No direct hacks elsewhere.
 * See ADR-005, AGENTS.md, ISiteStrategy.
 * 
 * This is the foundation for a hack-free, maintainable, PoE2-first codebase.
 */

import { ISiteStrategy } from './site-strategy';
import { PoE1SiteStrategy } from './poe1-strategy';
import { PoE2SiteStrategy } from './poe2-strategy';

export class PoeTradeSiteAdapter {
  private strategy: ISiteStrategy;

  constructor() {
    this.strategy = this.isPoE2() ? new PoE2SiteStrategy() : new PoE1SiteStrategy();
  }

  private isPoE2(): boolean {
    if (typeof location === 'undefined') return false;
    return location.pathname.includes('/trade2') || location.href.includes('trade2');
  }

  // Delegate all to current strategy
  getModSelectors(): string { return this.strategy.getModSelectors(); }
  getStatHashForKey(key: string): string | undefined { return this.strategy.getStatHashForKey(key); }
  hasSiteApp(): boolean { return this.strategy.hasSiteApp(); }
  getRowId(mod: HTMLElement): string { return this.strategy.getRowId(mod); }
  prepareModForButtons(mod: HTMLElement): void { this.strategy.prepareModForButtons(mod); }
  decorateModForFiner(mod: HTMLElement): void { this.strategy.decorateModForFiner(mod); }
  prepareAndDecorateModForFinerButtons(mod: HTMLElement): void { this.strategy.prepareAndDecorateModForFinerButtons(mod); }
  attachFilterButtons(mod: HTMLElement, buttonsElement: HTMLElement): void { this.strategy.attachFilterButtons(mod, buttonsElement); }
  scanVisibleMods(root?: ParentNode): void { this.strategy.scanVisibleMods(root); }
  async addStatFilter(
    hash: string,
    mode: 'include' | 'exclude' = 'include',
    rowId?: string,
  ): Promise<boolean> {
    return this.strategy.addStatFilter(hash, mode, rowId);
  }
  async removeStatFilter(hash: string): Promise<boolean> { return this.strategy.removeStatFilter(hash); }
  async applyGlobalPresetAction(types: string[], prefix: string, isAdd: boolean): Promise<void> {
    return this.strategy.applyGlobalPresetAction(types, prefix, isAdd);
  }
  isMagicSupported(): boolean { return this.strategy.isMagicSupported(); }
  getCurrentFilterGroups(_type?: string): unknown[] { return this.strategy.getCurrentFilterGroups(_type); }

  // Version switch if needed (e.g. dynamic)
  switchStrategy() {
    this.strategy = this.isPoE2() ? new PoE2SiteStrategy() : new PoE1SiteStrategy();
  }
}

export const poeTradeAdapter = new PoeTradeSiteAdapter();