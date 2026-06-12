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
    // For PoE2, we may not have easy "is filtered" without poking; use class or skip for now.
    // To keep magic, assume filterable unless we implement state tracking.
    mod.classList.add('finer-filterable');  // Default; improve with PoE2 filter observation
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

    // Try inline for PoE2 too
    const host = mod.querySelector('[class*="lc.r"], [class*="mod-text"], .stat-line') as HTMLElement | null;
    (host || mod).appendChild(buttonsElement);
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
    const inputs = document.querySelectorAll('input[type="text"], input.search, .search-bar input') as NodeListOf<HTMLInputElement>;
    const target = Array.from(inputs).find((i) => i.offsetParent !== null) || inputs[0];
    if (!target) return false;

    const prefix = mode === 'exclude' ? '!' : '';
    const snippet = `${prefix}${hash}`;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    target.value = target.value.slice(0, start) + snippet + target.value.slice(end);
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.focus();
    target.setSelectionRange(start + snippet.length, start + snippet.length);
    return true;
  }

  async removeStatFilter(hash: string): Promise<boolean> {
    // For PoE2, similar injection or clear; for now basic.
    return this.addViaSearchInjection(hash, 'include');  // Placeholder
  }

  async applyGlobalPresetAction(types: string[], prefix: string, isAdd: boolean): Promise<void> {
    // For PoE2, inject the presets via search or simulate.
    // Use the injection for each.
    for (const key of types) {
      const h = this.getStatHashForKey(key) || key;
      await this.addViaSearchInjection(`${prefix}${h}`, isAdd ? 'include' : 'exclude');
    }
  }

  isMagicSupported(): boolean {
    // For PoE2, we support button attachment + injection.
    return true;  // DOM based
  }

  getCurrentFilterGroups(type?: string): any[] {
    return [];  // PoE2 may not expose easily; implement observation if needed for "is filtered".
  }

  getRowId(mod: HTMLElement): string {
    // Reuse or PoE2 specific
    const row = mod.closest('[data-id]') as HTMLElement | null;
    return row?.getAttribute('data-id') || row?.id || mod.dataset.rowid || '';
  }
}