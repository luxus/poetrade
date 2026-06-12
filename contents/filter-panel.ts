import { poeTradeAdapter } from "../lib/site-adapter/poe-trade-adapter";

/**
 * Finer Filters main-world logic.
 *
 * Responsibilities (kept deliberately thin and "pure"):
 * - Inject the Svelte FinerFilters preset panel (via custom events).
 * - Observe the result list and inject +/- buttons on individual stat lines.
 * - On button click → ask the adapter to perform the filter mutation (the "magic").
 * - Small niceties like ensuring ~ prefix on native search inputs.
 *
 * ALL knowledge of how to talk to the PoE trade site's filter system lives in the adapter.
 * See lib/site-adapter/poe-trade-adapter.ts and ADR-005.
 */
export const initFilterPanel = () => {
  if ((window as any).__KROX_STARTED__) {
    return;
  }
  (window as any).__KROX_STARTED__ = true;

  // ---------- pure DOM helpers (no site knowledge) ----------
  const $ = (sel: string, root: ParentNode = document) => root.querySelector(sel);
  const $$ = (sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll(sel));

  const h = (html: string) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild as HTMLElement | null;
  };

  // ---------- button templates (UI concern) ----------
  const filteredOverlay = () => h(`<div class="finer-filtered-overlay"></div>`);
  const buttonsTemplate = () => h(`
    <span id="btns-finer">
      <span class="btn-finer rm"  data-action="rmv-filter"  title="remove this mod from your search results">-</span>
      <span class="btn-finer add" data-action="add-filter"  title="add this mod to your search filters">+</span>
    </span>`);

  // ---------- preset list (can move to adapter later if we want) ----------
  const listModifiers = [
    {
      name: 'Pseudo Res/Life',
      types: ['life', 'cold', 'fire', 'light', 'chaos'],
      prefix: 'pseudo.pseudo_',
    },
    {
      name: 'Explicit Res/Life',
      types: ['explicit_life', 'explicit_cold', 'explicit_fire', 'explicit_light', 'explicit_chaos'],
      prefix: 'explicit.stat_',
    },
    {
      name: 'Attack Weapon',
      types: [
        'explicit_inc_phy_dmg',
        'explicit_add_phy_local',
        'explicit_add_fire_local',
        'explicit_add_cold_local',
        'explicit_add_light_local',
        'explicit_add_chaos_local',
        'explicit_inc_attack_speed_local',
        'explicit_inc_crit_chance',
        'explicit_global_crit_mult',
      ],
      prefix: 'explicit.stat_',
    },
    {
      name: 'Spell Weapon',
      types: [
        'explicit_inc_spell_dmg',
        'explicit_inc_fire_spell_dmg',
        'explicit_inc_cold_spell_dmg',
        'explicit_inc_light_spell_dmg',
        'explicit_add_fire_spell_dmg',
        'explicit_add_cold_spell_dmg',
        'explicit_add_light_spell_dmg',
        'explicit_gain_extra_fire_damage',
        'explicit_gain_extra_cold_damage',
        'explicit_gain_extra_light_damage',
        'explicit_level_all_spells',
        'explicit_level_all_fire_spells',
        'explicit_level_all_cold_spells',
        'explicit_level_all_light_spells',
        'explicit_level_all_physical_spells',
        'explicit_level_all_chaos_spells',
        'explicit_inc_cast_speed',
        'explicit_global_crit_mult',
      ],
      prefix: 'explicit.stat_',
    },
  ];

  // Bridge for the Svelte preset buttons in the sidebar
  document.addEventListener('krox-finer-action', async (e: Event) => {
    const d = (e as CustomEvent).detail;
    if (!d) return;
    if (d.action === 'global-plus' || d.action === 'global-minus') {
      const isAdd = d.action === 'global-plus';
      const types = (d.types || '').split(',').filter(Boolean);
      const prefix = d.prefix || '';
      await poeTradeAdapter.applyGlobalPresetAction(types, prefix, isAdd);
    }
  });

  // ---------- result mod decoration & button injection ----------
  const modSelectors = poeTradeAdapter.getModSelectors();

  const attachButtons = (mod: HTMLElement) => {
    const btns = buttonsTemplate();
    if (!btns) return;

    // Clean previous wrappers (idempotent)
    const stale = mod.querySelectorAll(':scope > .finer-mod-content, :scope > .finer-mod-actions');
    stale.forEach((w) => {
      while (w.firstChild) mod.insertBefore(w.firstChild, w);
      w.remove();
    });

    if (mod.querySelector('#btns-finer')) return;

    mod.style.position = 'relative';
    mod.style.overflow = 'visible';

    // Let adapter attach any data it needs (hash, rowid)
    poeTradeAdapter.prepareModForButtons(mod);

    mod.appendChild(btns);
  };

  const decorateAndAttach = (mod: HTMLElement) => {
    // Adapter does the "is already filtered?" check and class + data work
    // (it internally uses the current site filter groups)
    const ISGs = poeTradeAdapter.getCurrentFilterGroups();
    // We still call the old decorate logic? No — we moved the knowledge.
    // For now we keep a thin local version that uses adapter data.
    // TODO next: move full decorateMod into adapter too.

    const hash = mod.dataset.hash;
    const isFiltered = hash
      ? ISGs.some((g: any) => g.filters?.some((f: any) => f.id === hash))
      : false;

    if (isFiltered) {
      mod.classList.add('finer-filtered');
      if (!mod.querySelector('.finer-filtered-overlay')) {
        const o = filteredOverlay();
        if (o) mod.appendChild(o);
      }
    } else {
      mod.classList.add('finer-filterable');
    }

    attachButtons(mod);
  };

  const scanVisibleMods = (root: ParentNode = document) => {
    Array.from(root.querySelectorAll(modSelectors) as NodeListOf<HTMLElement>).forEach((mod) => {
      // Let adapter do the hash/row work + it can also decorate if we extend it
      poeTradeAdapter.prepareModForButtons(mod);
      decorateAndAttach(mod);
    });
  };

  // Hover a result row → decorate its mods
  const onEnter = (selector: string, handler: (e: Event, el: HTMLElement) => void) => {
    document.addEventListener('mouseover', (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest(selector) as HTMLElement | null;
      if (!el) return;
      const rt = e.relatedTarget as Node | null;
      if (rt && (rt === el || el.contains(rt))) return;
      handler(e, el);
    });
  };

  onEnter('.resultset > .row, .resultset > .result-item, .search-results .result-item, .search-results .row', (e, row) => {
    if (row.classList.contains('finer-processed')) return;

    if (!poeTradeAdapter.hasSiteApp()) {
      console.warn('[Krox] Site app not found – PoE2 or major site change?');
    }

    const mods = Array.from(row.querySelectorAll(modSelectors)) as HTMLElement[];
    mods.forEach(decorateAndAttach);
    row.classList.add('finer-processed');
  });

  // Initial pass + observer
  scanVisibleMods();

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches?.(modSelectors)) {
          decorateAndAttach(node);
        }
        scanVisibleMods(node);
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Click handlers on the injected +/- buttons → pure delegation to adapter
  const on = (type: string, selector: string, handler: (e: Event, el: HTMLElement) => void) => {
    document.addEventListener(type, (e: Event) => {
      const el = (e.target as HTMLElement | null)?.closest(selector) as HTMLElement | null;
      if (!el) return;
      handler(e, el);
    });
  };

  on('click', '[data-action="add-filter"]', async (_e, el) => {
    const hash = el.closest('#btns-finer')?.getAttribute('data-hash') || '';
    if (hash) await poeTradeAdapter.addStatFilter(hash, 'include');
  });

  on('click', '[data-action="rmv-filter"]', async (_e, el) => {
    const hash = el.closest('#btns-finer')?.getAttribute('data-hash') || '';
    if (hash) await poeTradeAdapter.addStatFilter(hash, 'exclude');
  });

  // ---------- small quality-of-life: auto ~ prefix on native search fields ----------
  const findTradeSearchInput = (target: EventTarget | null): HTMLInputElement | null => {
    if (!(target instanceof Element)) return null;
    const input = target.closest('input.multiselect__input');
    return input instanceof HTMLInputElement ? input : null;
  };

  const setNativeInputValue = (input: HTMLInputElement, value: string) => {
    const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    desc?.set?.call(input, value);
  };

  const prefixingInputs = new WeakSet<HTMLInputElement>();

  const ensureRegexPrefix = (input: HTMLInputElement, inputType?: string) => {
    const value = input.value ?? '';
    if (!value || value.startsWith('~') || value.startsWith(' ')) return;
    if (inputType?.startsWith('delete')) return;
    if (prefixingInputs.has(input)) return;

    prefixingInputs.add(input);
    try {
      const start = input.selectionStart ?? value.length;
      const end = input.selectionEnd ?? value.length;
      const canRange = typeof input.setRangeText === 'function' && start != null && end != null;

      if (canRange) {
        input.setRangeText('~', 0, 0, 'preserve');
      } else {
        setNativeInputValue(input, `~${value}`);
        input.setSelectionRange(start + 1, end + 1);
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } finally {
      queueMicrotask(() => prefixingInputs.delete(input));
    }
  };

  document.addEventListener('input', (e: Event) => {
    const input = findTradeSearchInput(e.target);
    if (!input) return;
    const ie = e as InputEvent;
    if (ie.isComposing) return;
    ensureRegexPrefix(input, ie.inputType);
  }, true);
};