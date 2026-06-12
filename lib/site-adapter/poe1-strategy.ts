/**
 * PoE1 Strategy for site integration.
 * Contains the current (encapsulated) implementation that delivers the "magic"
 * instant filter add UX using the site's Vue internals.
 * 
 * This is the "necessary" part for PoE1 to keep the UX perfect.
 * Future: May be replaced if PoE ever provides better hooks.
 */
import { ISiteStrategy } from './site-strategy';

export class PoE1SiteStrategy implements ISiteStrategy {
  private readonly modSelectors = '.item-popup__content .item-mod, .itemBoxContent > .content > div, .content [class*="Mod"], .item-stats .stat-line';

  private readonly statHashMap: Record<string, string> = {
    life: "total_life",
    cold: "total_cold_resistance",
    fire: "total_fire_resistance",
    light: "total_lightning_resistance",
    chaos: "total_chaos_resistance",
    move: "increased_movement_speed",
    allR: "total_elemental_resistance",
    explicit_life: "3299347043",
    explicit_cold: "4220027924",
    explicit_fire: "3372524247",
    explicit_light: "1671376347",
    explicit_chaos: "2923486259",
    explicit_inc_phy_dmg: "1509134228",
    explicit_add_phy_local: "1940865751",
    explicit_add_fire_local: "709508406",
    explicit_add_cold_local: "1037193709",
    explicit_add_light_local: "3336890334",
    explicit_add_chaos_local: "2223678961",
    explicit_inc_attack_speed_local: "210067635",
    explicit_inc_crit_chance: "2375316951",
    explicit_global_crit_mult: "3556824919",
    explicit_inc_spell_dmg: "2974417149",
    explicit_inc_fire_spell_dmg: "3962278098",
    explicit_inc_cold_spell_dmg: "3291658075",
    explicit_inc_light_spell_dmg: "2231156303",
    explicit_add_fire_spell_dmg: "1133016593",
    explicit_add_cold_spell_dmg: "2469416729",
    explicit_add_light_spell_dmg: "2831165374",
    explicit_level_all_spells: "124131830",
    explicit_level_all_fire_spells: "591105508",
    explicit_level_all_cold_spells: "2254480358",
    explicit_level_all_light_spells: "1545858329",
    explicit_level_all_physical_spells: "4226189338",
    explicit_level_all_chaos_spells: "2891184298",
    explicit_inc_cast_speed: "737908626",
    explicit_gain_extra_fire_damage: "3015669065",
    explicit_gain_extra_cold_damage: "2505884597",
    explicit_gain_extra_light_damage: "3278136794",
  };

  private finder(vm: any, v: string): boolean {  // eslint-disable-line @typescript-eslint/no-explicit-any
    return vm?.$vnode?.tag?.includes?.(v) ?? false;
  }

  private getApp(): any {  // eslint-disable-line @typescript-eslint/no-explicit-any
    return (window as any).app;  // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  private findVueItem(tags: string[]): any {  // eslint-disable-line @typescript-eslint/no-explicit-any
    return tags.reduce((acc, v) => acc?.$children?.find?.((e: any) => this.finder(e, v)), this.getApp());  // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  getItemSearchGroups(_type?: string): any[] {  // eslint-disable-line @typescript-eslint/no-explicit-any
    const panel = this.findVueItem(["item-search-panel", "item-filter-panel"]);
    return panel?.$children?.filter?.((e: any) => this.finder(e, "stat-filter-group") && (_type ? e.group.type === _type : true)) || [];  // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  createSiteFilter(id: string) {
    return id ? { id, value: {}, disabled: false } : null;
  }

  getModSelectors(): string {
    return this.modSelectors;
  }

  getStatHashForKey(key: string): string | undefined {
    return this.statHashMap[key];
  }

  hasSiteApp(): boolean {
    return !!this.getApp();
  }

  getRowId(mod: HTMLElement): string {
    const row = mod.closest('[data-id]') as HTMLElement | null;
    return row?.getAttribute('data-id') || row?.id || mod.dataset.rowid || '';
  }

  prepareModForButtons(mod: HTMLElement): void {
    const sEl = mod.querySelector('.lc.s') as HTMLElement;
    const fieldVal = sEl?.dataset?.field || sEl?.getAttribute('data-field') || '';
    const hash = fieldVal.startsWith('stat.') ? fieldVal.slice(5) : fieldVal;
    if (hash) mod.dataset.hash = hash;
    const rowId = this.getRowId(mod);
    if (rowId) mod.dataset.rowid = rowId;
  }

  decorateModForFiner(mod: HTMLElement): void {
    const hash = mod.dataset.hash;
    if (!hash) return;
    const ISGs = this.getItemSearchGroups();
    const isInFilters = ISGs.some((isg: any) => isg.filters && isg.filters.some((f: any) => f.id === hash));
    mod.classList.remove('finer-filtered', 'finer-filterable');
    mod.classList.add(isInFilters ? 'finer-filtered' : 'finer-filterable');
  }

  prepareAndDecorateModForFinerButtons(mod: HTMLElement): void {
    this.prepareModForButtons(mod);
    this.decorateModForFiner(mod);
  }

  attachFilterButtons(mod: HTMLElement, buttonsElement: HTMLElement): void {
    // Clean stale
    const staleWrappers = mod.querySelectorAll(':scope > .finer-mod-content, :scope > .finer-mod-actions');
    staleWrappers.forEach((wrapper) => {
      while (wrapper.firstChild) mod.insertBefore(wrapper.firstChild, wrapper);
      wrapper.remove();
    });
    if (mod.querySelector('#btns-finer')) return;

    mod.style.overflow = 'visible';

    // Inline for compact (from javijec improvements)
    const host = mod.querySelector('.lc.r.su, .lc.r.pr, .lc.r') as HTMLElement | null;
    const target = host || mod;
    target.appendChild(buttonsElement);

    // Fixed right for special compact mods
    if (host && (host.classList.contains('lc.r.su') || host.classList.contains('lc.r.pr'))) {
      buttonsElement.classList.add('finer-fixed-right');
    }
  }

  scanVisibleMods(root: ParentNode = document): void {
    Array.from(root.querySelectorAll(this.modSelectors) as NodeListOf<HTMLElement>).forEach((mod) => {
      this.prepareAndDecorateModForFinerButtons(mod);
    });
  }

  async addStatFilter(hash: string, mode: 'include' | 'exclude' = 'include'): Promise<boolean> {
    const app = this.getApp();
    if (!app) return false;
    try {
      const filterType = mode === 'exclude' ? 'not' : 'and';
      const ISGs = this.getItemSearchGroups(filterType);
      const targetGroup = ISGs.find((g: any) => g.index === 0) || ISGs[0];  // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!targetGroup || !targetGroup.filters) return false;
      const existing = targetGroup.filters.some((f: any) => f.id === hash);  // eslint-disable-line @typescript-eslint/no-explicit-any
      if (existing) return true;
      const newFilter = this.createSiteFilter(hash);
      if (newFilter) targetGroup.filters.push(newFilter);
      if (typeof app.save === 'function') app.save(true);
      return true;
    } catch (err) {
      console.error('[PoE1Strategy] addStatFilter failed', err);
      return false;
    }
  }

  async removeStatFilter(hash: string): Promise<boolean> {
    const app = this.getApp();
    if (!app) return false;
    try {
      const allGroups = this.getItemSearchGroups();
      let removed = false;
      for (const group of allGroups) {
        if (!group.filters) continue;
        const before = group.filters.length;
        group.filters = group.filters.filter((f: any) => f.id !== hash);  // eslint-disable-line @typescript-eslint/no-explicit-any
        if (group.filters.length !== before) removed = true;
      }
      if (removed && typeof app.save === 'function') app.save(true);
      return removed;
    } catch (err) {
      console.error('[PoE1Strategy] removeStatFilter failed', err);
      return false;
    }
  }

  async applyGlobalPresetAction(types: string[], prefix: string, isAdd: boolean): Promise<void> {
    // For PoE1, we can do direct or keep event for now; direct is better for encapsulation.
    // To keep behavior, dispatch is fine, or implement direct here.
    // For genius, prefer direct mutation here.
    const filterType = isAdd ? 'and' : 'not';
    const ISG = this.getItemSearchGroups(filterType).find((g: any) => g.index === 0);  // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!ISG) return;
    types.forEach((_key: string) => {
      // const reHashed = `${prefix}${this.getStatHashForKey(key) || key}`;
      // Simplified: use add/remove
      // For full, replicate old logic if needed.
    });
    // For now, dispatch to not break existing Svelte bridge; can be improved.
    document.dispatchEvent(new CustomEvent('krox-finer-action', {
      detail: { action: isAdd ? 'global-plus' : 'global-minus', types: types.join(','), prefix }
    }));
  }

  isMagicSupported(): boolean {
    return this.hasSiteApp();  // has getApp in base or here
  }

  getCurrentFilterGroups(_type?: string): unknown[] {
    return this.getItemSearchGroups(_type);
  }
}