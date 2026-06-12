import { ISiteStrategy } from './site-strategy';

/**
 * PoE2 Strategy.
 * Focus on clean, non-hacky methods: DOM selectors, event simulation, search input injection.
 * Goal: Same "instant magic" feel for adding filters from results without deep poking if possible.
 * Current: Basic attachment + injection. Evolve toward full magic (tracked in issue #9).
 */
export class PoE2SiteStrategy implements ISiteStrategy {
  private readonly modSelectors = '.result-item .item-mod, .item-stats .stat-line, [class*="mod"], .result .mod';  // Approximate for PoE2; refine with live testing

  getModSelectors(): string {
    return this.modSelectors;
  }

  getStatHashForKey(key: string): string | undefined {
    // PoE2 hashes may differ; for now fall back or map if known.
    // For presets, we can use the key directly or improve.
    return key;  // Placeholder
  }

  hasSiteApp(): boolean {
    return false;  // PoE2 doesn't use the same window.app typically
  }

  prepareModForButtons(mod: HTMLElement): void {
    // PoE2: attach data for clicks
    const hash = mod.dataset.hash || this.extractHashFromMod(mod);
    if (hash) mod.dataset.hash = hash;
    const rowId = this.getRowId(mod);
    if (rowId) mod.dataset.rowid = rowId;
  }

  private extractHashFromMod(mod: HTMLElement): string {
    // PoE2 may have data-hash or in text/attributes differently.
    const sEl = mod.querySelector('.lc.s') as HTMLElement;
    const fieldVal = sEl?.dataset?.field || sEl?.getAttribute('data-field') || mod.dataset.hash || '';
    return fieldVal.startsWith('stat.') ? fieldVal.slice(5) : fieldVal;
  }

  decorateModForFiner(mod: HTMLElement): void {
    // Genius clean way for PoE2: use scraped current filters (no poking).
    const hash = mod.dataset.hash || this.extractHashFromMod(mod);
    if (!hash) {
      mod.classList.add('finer-filterable');
      return;
    }
    const active = this.getCurrentFilterGroups();
    const isFiltered = active.some((f: any) => f.id === hash || (f.text && f.text.includes(hash.toLowerCase())));
    mod.classList.remove('finer-filtered', 'finer-filterable');
    mod.classList.add(isFiltered ? 'finer-filtered' : 'finer-filterable');
  }

  prepareAndDecorateModForFinerButtons(mod: HTMLElement): void {
    this.prepareModForButtons(mod);
    this.decorateModForFiner(mod);
  }

  attachFilterButtons(mod: HTMLElement, buttonsElement: HTMLElement): void {
    // Clean and attach, inline where possible for PoE2 compact.
    const stale = mod.querySelectorAll(':scope > .finer-mod-content, :scope > .finer-mod-actions');
    stale.forEach((w) => { while (w.firstChild) mod.insertBefore(w.firstChild, w); w.remove(); });
    if (mod.querySelector('#btns-finer')) return;

    mod.style.overflow = 'visible';

    // Try inline for PoE2 too (adapted from javijec improvements for compact)
    const host = mod.querySelector('[class*="lc.r"], [class*="mod-text"], .stat-line, [class*="result"]') as HTMLElement | null;
    const targetHost = host || mod;
    targetHost.appendChild(buttonsElement);

    // Compact special mods fixed-right (su/pr like)
    if (host && (host.classList.contains('lc.r.su') || host.classList.contains('lc.r.pr') || host.classList.toString().includes('special'))) {
      buttonsElement.classList.add('finer-fixed-right');
    }
  }

  scanVisibleMods(root: ParentNode = document): void {
    Array.from(root.querySelectorAll(this.modSelectors) as NodeListOf<HTMLElement>).forEach((mod) => {
      this.prepareAndDecorateModForFinerButtons(mod);
    });
  }

  async addStatFilter(hash: string, mode: 'include' | 'exclude' = 'include'): Promise<boolean> {
    // Use clean injection for PoE2 (no deep hack)
    return this.addViaSearchInjection(hash, mode);
  }

  private async addViaSearchInjection(hash: string, mode: 'include' | 'exclude'): Promise<boolean> {
    const inputs = document.querySelectorAll('input[type="text"], input.search, .search-bar input, .search input') as NodeListOf<HTMLInputElement>;
    const target = Array.from(inputs).find((i) => i.offsetParent !== null) || inputs[0];
    if (!target) return false;

    const prefix = mode === 'exclude' ? '!' : '~';  // ~ for include, common in trade search
    const snippet = `${prefix}${hash}`;

    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    target.value = target.value.slice(0, start) + snippet + target.value.slice(end);
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.focus();
    target.setSelectionRange(start + snippet.length, start + snippet.length);

    // "Magic" touch for instant feel: trigger the site's search/results update.
    // This makes the added filter "sofort" affect the results, emulating PoE1 magic cleanly via DOM/events.
    setTimeout(() => {
      const searchBtn = document.querySelector('.search-btn, .btn.search-btn, button.search, [class*="search-btn"]') as HTMLElement | null;
      if (searchBtn) {
        searchBtn.click();
      } else {
        // Fallback: simulate Enter to trigger live search
        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true });
        target.dispatchEvent(enterEvent);
        target.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
      }
    }, 30);

    return true;
  }

  async removeStatFilter(hash: string): Promise<boolean> {
    // For PoE2, use injection to "remove" by adding exclude or clearing; use the add logic with exclude for toggle feel.
    return this.addViaSearchInjection(hash, 'exclude');
  }

  async applyGlobalPresetAction(types: string[], prefix: string, isAdd: boolean): Promise<void> {
    // For PoE2, cleanly inject each preset via search (no hack).
    // This makes the global buttons in the sidebar "magic" on PoE2 too.
    for (const key of types) {
      const h = this.getStatHashForKey(key) || key;
      const effectivePrefix = prefix || '';
      await this.addViaSearchInjection(`${effectivePrefix}${h}`, isAdd ? 'include' : 'exclude');
    }
  }

  isMagicSupported(): boolean {
    // For PoE2, we support button attachment + injection.
    return true;  // DOM based
  }

  getCurrentFilterGroups(_type?: string): unknown[] {
    // Clean PoE2 way: scrape visible active filters from the site's filter UI.
    // This avoids any poking. Matches on text or data for "is this mod already filtered?"
    const active: any[] = [];
    // Common PoE2 filter display elements (refine as needed)
    document.querySelectorAll('.filter-list .filter, .search-advanced .filter, [class*="active-filter"], .stat-filter-group .filter-title').forEach((el: Element) => {
      const text = (el.textContent || '').trim().toLowerCase();
      const dataId = (el as HTMLElement).dataset?.id || (el as HTMLElement).dataset?.hash || '';
      if (text || dataId) {
        active.push({ id: dataId || text, text });
      }
    });
    return active;
  }

  getRowId(mod: HTMLElement): string {
    // Reuse or PoE2 specific
    const row = mod.closest('[data-id]') as HTMLElement | null;
    return row?.getAttribute('data-id') || row?.id || mod.dataset.rowid || '';
  }
}