/**
 * Site Adapter for Path of Exile Trade (PoE1 + PoE2)
 *
 * SINGLE SOURCE OF TRUTH for all interaction with the official trade site's DOM and internal state.
 *
 * Design goals (pure genius, no scattered hacks):
 * - Clean, high-level public API for adding/removing filters, querying state, and decorating UI.
 * - All PoE-site-specific weirdness (Vue poking for PoE1, future PoE2 mechanisms) lives here only.
 * - Strategy-ready for PoE1 vs PoE2.
 * - Preserves the exact "magic" UX: hover a stat in results → instant +/- buttons that update the site's filters live.
 * - Documented current trade-offs so future work can improve them.
 *
 * Per ADR-005 and AGENTS.md:
 * - No other file is allowed to poke window.app, $children, or do raw site Vue/DOM filter manipulation.
 * - This adapter owns the "last resort" poking for the beloved instant filter feature.
 *
 * PoE2 focus: This is where the PoE2 implementation will live.
 */

export class PoeTradeSiteAdapter {
  // ============================================
  // PoE1-specific internals (current implementation of the magic)
  // ============================================

  private readonly POE1_MOD_SELECTORS =
    '.item-popup__content .item-mod, .itemBoxContent > .content > div, .content [class*="Mod"], .item-stats .stat-line';

  // PoE2 result stat selectors (approximate; PoE2 trade UI is different, refine in #9)
  private readonly POE2_MOD_SELECTORS =
    '.result-item .item-mod, .item-stats .stat-line, [class*="mod"]';

  /**
   * Map from our human/preset keys → site's internal stat hash IDs.
   * These hashes are what the site's filter engine actually uses.
   */
  private readonly POE1_STAT_HASH_MAP: Record<string, string> = {
    life: 'total_life',
    cold: 'total_cold_resistance',
    fire: 'total_fire_resistance',
    light: 'total_lightning_resistance',
    chaos: 'total_chaos_resistance',
    move: 'increased_movement_speed',
    allR: 'total_elemental_resistance',
    explicit_life: '3299347043',
    explicit_cold: '4220027924',
    explicit_fire: '3372524247',
    explicit_light: '1671376347',
    explicit_chaos: '2923486259',
    explicit_inc_phy_dmg: '1509134228',
    explicit_add_phy_local: '1940865751',
    explicit_add_fire_local: '709508406',
    explicit_add_cold_local: '1037193709',
    explicit_add_light_local: '3336890334',
    explicit_add_chaos_local: '2223678961',
    explicit_inc_attack_speed_local: '210067635',
    explicit_inc_crit_chance: '2375316951',
    explicit_global_crit_mult: '3556824919',
    explicit_inc_spell_dmg: '2974417149',
    explicit_inc_fire_spell_dmg: '3962278098',
    explicit_inc_cold_spell_dmg: '3291658075',
    explicit_inc_light_spell_dmg: '2231156303',
    explicit_add_fire_spell_dmg: '1133016593',
    explicit_add_cold_spell_dmg: '2469416729',
    explicit_add_light_spell_dmg: '2831165374',
    explicit_level_all_spells: '124131830',
    explicit_level_all_fire_spells: '591105508',
    explicit_level_all_cold_spells: '2254480358',
    explicit_level_all_light_spells: '1545858329',
    explicit_level_all_physical_spells: '4226189338',
    explicit_level_all_chaos_spells: '2891184298',
    explicit_inc_cast_speed: '737908626',
    explicit_gain_extra_fire_damage: '3015669065',
    explicit_gain_extra_cold_damage: '2505884597',
    explicit_gain_extra_light_damage: '3278136794',
  };

  private finder(vm: any, v: string): boolean {
    return vm?.$vnode?.tag?.includes?.(v) ?? false;
  }

  private getApp(): any | null {
    return (typeof window !== 'undefined' ? (window as any).app : null) ?? null;
  }

  private findVueItem(tags: string[]): any | null {
    const app = this.getApp();
    if (!app) return null;
    return tags.reduce((acc, v) => acc?.$children?.find?.((e: any) => this.finder(e, v)), app);
  }

  private getItemSearchGroups(_type?: string): any[] {
    const panel = this.findVueItem(['item-search-panel', 'item-filter-panel']);
    return (
      panel?.$children?.filter?.(
        (e: any) => this.finder(e, 'stat-filter-group') && (_type ? e.group.type === _type : true)
      ) || []
    );
  }

  private createSiteFilter(id: string) {
    return id ? { id, value: {}, disabled: false } : null;
  }

  // ============================================
  // Public API (the "genius" clean interface)
  // ============================================

  /**
   * Whether the current page has the site's app object (mainly PoE1).
   * Used by callers to decide graceful behavior.
   */
  hasSiteApp(): boolean {
    return !!this.getApp();
  }

  private isPoE2(): boolean {
    if (typeof location === 'undefined') return false;
    return location.pathname.includes('/trade2') || location.href.includes('trade2');
  }

  /**
   * Returns the CSS selectors for finding stats on result items for the current site version.
   */
  getModSelectors(): string {
    return this.isPoE2() ? this.POE2_MOD_SELECTORS : this.POE1_MOD_SELECTORS;
  }

  /**
   * Resolves one of our preset keys to the site's internal hash (if known for current version).
   */
  getStatHashForKey(key: string): string | undefined {
    return this.POE1_STAT_HASH_MAP[key];
  }

  /**
   * The core magic: add a specific stat hash to the site's active filters.
   * This is what makes the +/- buttons on result mods feel instantaneous.
   *
   * Current PoE1 implementation uses direct (encapsulated) manipulation of the site's
   * Vue filter group state. This is the technique that delivers the beloved UX today.
   *
   * Returns true if the filter was added (or already present).
   */
  async addStatFilter(hash: string, mode: 'include' | 'exclude' = 'include'): Promise<boolean> {
    const app = this.getApp();
    if (!app) {
      // PoE2 or site without app → caller (e.g. filter-panel) can fall back
      return false;
    }

    try {
      const filterType = mode === 'exclude' ? 'not' : 'and';
      const groups = this.getItemSearchGroups(filterType);
      const target = groups.find((g: any) => g.index === 0) || groups[0];

      if (!target?.filters) {
        console.warn('[PoeTradeAdapter] Could not locate target filter group for magic add');
        return false;
      }

      const already = target.filters.some((f: any) => f.id === hash);
      if (already) return true;

      const newF = this.createSiteFilter(hash);
      if (newF) target.filters.push(newF);

      if (typeof app.save === 'function') {
        app.save(true); // triggers the site's re-render / result update (the "magic" part)
      }
      return true;
    } catch (err) {
      console.error('[PoeTradeAdapter] addStatFilter failed', err);
      return false;
    }
  }

  /**
   * Remove a stat filter (used when user clicks the minus on an already-active mod).
   */
  async removeStatFilter(hash: string): Promise<boolean> {
    const app = this.getApp();
    if (!app) return false;

    try {
      const groups = this.getItemSearchGroups();
      let changed = false;

      for (const g of groups) {
        if (!g.filters) continue;
        const before = g.filters.length;
        g.filters = g.filters.filter((f: any) => f.id !== hash);
        if (g.filters.length !== before) changed = true;
      }

      if (changed && typeof app.save === 'function') {
        app.save(true);
      }
      return changed;
    } catch (err) {
      console.error('[PoeTradeAdapter] removeStatFilter failed', err);
      return false;
    }
  }

  // --- Decoration helpers (so filter-panel.ts doesn't need to know about Vue) ---

  getRowId(mod: HTMLElement): string {
    const row = mod.closest('[data-id]') as HTMLElement | null;
    return row?.getAttribute('data-id') || row?.id || mod.dataset.rowid || '';
  }

  /**
   * Attaches data attributes needed for later clicks (rowid, hash).
   * Actual +/- button DOM is still created by the caller for now (keeps HTML in one place).
   */
  prepareModForButtons(mod: HTMLElement): void {
    const sEl = mod.querySelector('.lc.s') as HTMLElement;
    const fieldVal = sEl?.dataset?.field || sEl?.getAttribute('data-field') || '';
    const hash = fieldVal.startsWith('stat.') ? fieldVal.slice(5) : fieldVal;

    if (hash) mod.dataset.hash = hash;

    const rowId = this.getRowId(mod);
    if (rowId) mod.dataset.rowid = rowId;

    // Visual state classes are set by the caller using getCurrentFilterGroups()
    // or we can expose a higher-level "decorate" later.
  }

  /**
   * Returns current filter groups (read-only use by decoration code).
   * Callers should treat the returned objects as opaque.
   */
  getCurrentFilterGroups(type?: string): any[] {
    return this.getItemSearchGroups(type);
  }

  // ============================================
  // PoE2 (future home of clean PoE2 implementation)
  // ============================================

  async addStatFilterPoE2(_hash: string, _mode: 'include' | 'exclude' = 'include'): Promise<boolean> {
    // TODO (high priority per owner): implement for PoE2 trade site.
    // Goal: same instant-magic feeling using whatever the PoE2 trade UI exposes.
    // Start with DOM simulation or the PoE2 equivalent of filter state.
    console.info('[PoeTradeAdapter] PoE2 addStatFilter not implemented yet');
    return false;
  }

  // Bridge for the global preset buttons coming from the Svelte sidebar.
  // Currently dispatches the event the PoE1 main-world script listens to.
  // In a future cleanup we can make this go through the adapter directly.
  async applyGlobalPresetAction(types: string[], prefix: string, isAdd: boolean): Promise<void> {
    document.dispatchEvent(
      new CustomEvent('krox-finer-action', {
        detail: {
          action: isAdd ? 'global-plus' : 'global-minus',
          types: types.join(','),
          prefix,
        },
      })
    );
  }

  isMagicSupportedForCurrentSite(): boolean {
    // For PoE1: window.app present
    // For PoE2: will become more sophisticated
    return this.hasSiteApp();
  }
}

export const poeTradeAdapter = new PoeTradeSiteAdapter();