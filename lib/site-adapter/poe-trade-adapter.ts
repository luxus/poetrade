/**
 * Site Adapter for Path of Exile Trade
 *
 * This is the ONLY place in the codebase that is allowed to contain:
 * - Deep DOM scraping of the official trade site
 * - Direct interaction with the site's internal Vue instance (window.app + $children)
 * - Event simulation or filter state mutation
 *
 * Goal (per ADR-005):
 * - Preserve the exact "magical" UX of Finer Filters (instant +/- buttons on hovered result stats that immediately affect the site's filters).
 * - Provide a clean, high-level API for the rest of the app.
 * - Make future PoE2 support and gradual replacement of hacks possible.
 *
 * Current status:
 * - PoE1: Full behavior preserved (the previous direct hacks are now encapsulated here).
 * - PoE2: Stub / not yet implemented (feature will gracefully indicate limited support).
 *
 * Never import from this file directly in UI components except through well-defined services.
 * See AGENTS.md for the strict rule.
 */

export interface StatFilterMode {
  include: 'and' | 'not';
}

export class PoeTradeSiteAdapter {
  // --- PoE1 implementation (encapsulated from old filter-panel.ts) ---

  private readonly modSelectors = '.item-popup__content .item-mod, .itemBoxContent > .content > div, .content [class*="Mod"], .item-stats .stat-line';

  private finder(vm: any, v: string): boolean {
    return vm?.$vnode?.tag?.includes?.(v) ?? false;
  }

  private getApp(): any {
    return (window as any).app;
  }

  private findVueItem(tags: string[]): any {
    return tags.reduce((acc, v) => acc?.$children?.find?.((e: any) => this.finder(e, v)), this.getApp());
  }

  private ItemSearchGroupsVueItems(_type?: string): any[] {
    const panel = this.findVueItem(["item-search-panel", "item-filter-panel"]);
    return panel?.$children?.filter?.((e: any) => this.finder(e, "stat-filter-group") && (_type ? e.group.type === _type : true)) || [];
  }

  private createFilter(id: string) {
    return id ? { id, value: {}, disabled: false } : null;
  }

  /**
   * Core "magic" function: directly add a stat to the site's active filter groups.
   * This is what makes the +/- buttons feel instant.
   *
   * For PoE1 this uses the internal Vue state (acknowledged last-resort strategy).
   * For PoE2 this is currently a stub.
   */
  async addStatFilter(hash: string, mode: 'include' | 'exclude' = 'include'): Promise<boolean> {
    const app = this.getApp();
    if (!app) {
      console.warn("[PoeTradeAdapter] No window.app found — likely PoE2 or site change");
      return false;
    }

    try {
      const filterType = mode === 'exclude' ? 'not' : 'and';
      const ISGs = this.ItemSearchGroupsVueItems(filterType);
      const targetGroup = ISGs.find((g: any) => g.index === 0) || ISGs[0];

      if (!targetGroup || !targetGroup.filters) {
        console.warn("[PoeTradeAdapter] Could not find target filter group");
        return false;
      }

      const existing = targetGroup.filters.some((f: any) => f.id === hash);
      if (existing) return true;

      const newFilter = this.createFilter(hash);
      if (newFilter) {
        targetGroup.filters.push(newFilter);
      }

      // Trigger the site to re-evaluate (this is part of the magic)
      if (typeof app.save === 'function') {
        app.save(true);
      }

      return true;
    } catch (err) {
      console.error("[PoeTradeAdapter] addStatFilter failed", err);
      return false;
    }
  }

  /**
   * Remove a previously added stat filter.
   */
  async removeStatFilter(hash: string): Promise<boolean> {
    const app = this.getApp();
    if (!app) return false;

    try {
      const allGroups = this.ItemSearchGroupsVueItems();
      let removed = false;

      for (const group of allGroups) {
        if (!group.filters) continue;
        const before = group.filters.length;
        group.filters = group.filters.filter((f: any) => f.id !== hash);
        if (group.filters.length !== before) removed = true;
      }

      if (removed && typeof app.save === 'function') {
        app.save(true);
      }

      return removed;
    } catch (err) {
      console.error("[PoeTradeAdapter] removeStatFilter failed", err);
      return false;
    }
  }

  // --- PoE2 support (to be implemented, focus area) ---
  // For now we return false so callers can decide on graceful fallback.
  async addStatFilterPoE2(_hash: string, _mode: 'include' | 'exclude' = 'include'): Promise<boolean> {
    console.info("[PoeTradeAdapter] PoE2 addStatFilter not yet implemented");
    return false;
  }

  // Helper used by the old FinerFilters preset buttons
  async applyGlobalFilterAction(types: string[], prefix: string, action: 'plus' | 'minus'): Promise<boolean> {
    // For PoE1 we still rely on the event system for now (will be cleaned in follow-up).
    // This method exists so the adapter owns the contract.
    document.dispatchEvent(new CustomEvent('krox-finer-action', {
      detail: { action: action === 'plus' ? 'global-plus' : 'global-minus', types: types.join(','), prefix }
    }));
    return true;
  }

  // Future: expose a way to check if full magic support is available for the current site version
  isMagicFilterSupported(): boolean {
    return !!this.getApp();
  }
}

export const poeTradeAdapter = new PoeTradeSiteAdapter();