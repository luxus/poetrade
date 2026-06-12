import { poeTradeAdapter } from "../lib/site-adapter/poe-trade-adapter";

export const initFilterPanel = () => {
  if ((window as any).__KROX_STARTED__) {
    return
  }

  ;(window as any).__KROX_STARTED__ = true

  // ---------- helpers ----------
  const $ = (sel: string, root = document) => root.querySelector(sel);
  const $$ = (sel: string, root = document) => Array.from(root.querySelectorAll(sel));
  type Handler = (e: Event, el: HTMLElement) => void;

  const on = (type: string, selector: string, handler: Handler, opts?: AddEventListenerOptions) => {
    document.addEventListener(type, (e: Event) => {
      const el = (e.target as HTMLElement | null)?.closest(selector) as HTMLElement | null;
      if (!el) return;
      handler.call(el, e, el);
    }, opts);
  };
  const onEnter = (selector: string, handler: Handler) => {
    document.addEventListener('mouseover', (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest(selector) as HTMLElement | null;
      if (!el) return;
      const rt = e.relatedTarget as Node | null;
      if (rt && (rt === el || el.contains(rt))) return;
      handler.call(el, e, el);
    });
  };
  const onLeave = (selector: string, handler: Handler) => {
    document.addEventListener('mouseout', (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest(selector) as HTMLElement | null;
      if (!el) return;
      const rt = e.relatedTarget as Node | null;
      if (rt && (rt === el || el.contains(rt))) return;
      handler.call(el, e, el);
    });
  };
  const h = (html: string) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  import { poeTradeAdapter } from "../lib/site-adapter/poe-trade-adapter";

  const listModifiers = [];
  listModifiers.push({
    name: 'Pseudo Res/Life',
    types: ['life', 'cold', 'fire', 'light', 'chaos'],
    prefix: 'pseudo.pseudo_',
  });
  listModifiers.push({
    name: 'Explicit Res/Life',
    types: ['explicit_life', 'explicit_cold', 'explicit_fire', 'explicit_light', 'explicit_chaos'],
    prefix: 'explicit.stat_',
  });
  listModifiers.push({
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
  });
  listModifiers.push({
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
      'explicit_global_crit_mult'
    ],
    prefix: 'explicit.stat_',
  });



  // ---------- overlay/button templates ----------
  const filteredOverlay = () => h(`<div class="finer-filtered-overlay"></div>`);
  const buttonsTemplate = () => h(`
    <span id="btns-finer">
      <span class="btn-finer rm"  data-action="rmv-filter"  title="remove this mod from your search results">-</span>
      <span class="btn-finer add" data-action="add-filter"  title="add this mod to your search filters">+</span>
    </span>`);

  // ---------- map ----------
  const modMap: Record<string, string> = {
    life:"total_life",
    cold:"total_cold_resistance",
    fire:"total_fire_resistance",
    light:"total_lightning_resistance",
    chaos:"total_chaos_resistance",
    move:"increased_movement_speed",
    allR:"total_elemental_resistance",
    explicit_life:"3299347043",
    explicit_cold:"4220027924",
    explicit_fire:"3372524247",
    explicit_light:"1671376347",
    explicit_chaos:"2923486259",
    explicit_inc_phy_dmg:"1509134228",
    explicit_add_phy_local:"1940865751",
    explicit_add_fire_local:"709508406",
    explicit_add_cold_local:"1037193709",
    explicit_add_light_local:"3336890334",
    explicit_add_chaos_local:"2223678961",
    explicit_inc_attack_speed_local:"210067635",
    explicit_inc_crit_chance:"2375316951",
    explicit_global_crit_mult:"3556824919",
    explicit_inc_spell_dmg:"2974417149",
    explicit_inc_fire_spell_dmg:"3962278098",
    explicit_inc_cold_spell_dmg:"3291658075",
    explicit_inc_light_spell_dmg:"2231156303",
    explicit_add_fire_spell_dmg:"1133016593",
    explicit_add_cold_spell_dmg:"2469416729",
    explicit_add_light_spell_dmg:"2831165374",
    explicit_level_all_spells:"124131830",
    explicit_level_all_fire_spells:"591105508",
    explicit_level_all_cold_spells:"2254480358",
    explicit_level_all_light_spells:"1545858329",
    explicit_level_all_physical_spells:"4226189338",
    explicit_level_all_chaos_spells:"2891184298",
    explicit_inc_cast_speed:"737908626",
    explicit_gain_extra_fire_damage:"3015669065",
    explicit_gain_extra_cold_damage:"2505884597",
    explicit_gain_extra_light_damage:"3278136794",
  };
  // Read-only helpers for UI decoration (which mods are already filtered, attach row/hash data).
  // Mutation always goes through the adapter.
  const getApp = () => (window as any).app;
  const finder = (vm: any, v: string) => vm?.$vnode?.tag?.includes?.(v);
  const findVueItem = (tags: string[]) => tags.reduce((acc, v) => acc?.$children?.find?.((e: any) => finder(e, v)), getApp());
  const ItemSearchGroupsVueItems = (_type?: string) => {
    const panel = findVueItem(["item-search-panel","item-filter-panel"]);
    return panel?.$children?.filter?.((e: any) => finder(e,"stat-filter-group") && (_type ? e.group.type === _type : true)) || [];
  };
  const createFilter = (id: string) => id && ({ id, value:{}, disabled:false });
  const findVueResultItem = (_itemId: string) => findVueItem(["item-results-panel","resultset"])?.$children?.find?.((e: any) => e.itemId === _itemId);
  const getGlobalApp = () => (window as any).app;

  const modSelectors = '.item-popup__content .item-mod, .itemBoxContent > .content > div, .content [class*="Mod"], .item-stats .stat-line';

  const getRowId = (mod: HTMLElement) => {
    const row = mod.closest('[data-id]') as HTMLElement | null;
    return row?.getAttribute('data-id') || row?.id || mod.dataset.rowid || '';
  };

  const attachButtons = (mod: HTMLElement) => {
    const btns = buttonsTemplate();
    if (!btns) return;

    const staleWrappers = mod.querySelectorAll(':scope > .finer-mod-content, :scope > .finer-mod-actions');
    staleWrappers.forEach((wrapper) => {
      while (wrapper.firstChild) {
        mod.insertBefore(wrapper.firstChild, wrapper);
      }
      wrapper.remove();
    });

    if (mod.querySelector('#btns-finer')) return;

    mod.style.position = "relative";
    mod.style.overflow = "visible";
    mod.style.display = "";
    mod.style.width = "";
    mod.style.boxSizing = "";
    mod.style.textAlign = "";

    const rowId = mod.dataset.rowid || getRowId(mod);
    const statHash = mod.dataset.hash || '';
    if (rowId) btns.setAttribute('data-rowid', rowId);
    if (statHash) btns.setAttribute('data-hash', statHash);

    mod.appendChild(btns);
  };

  const decorateMod = (mod: HTMLElement, ISGs: any[]) => {
    const sEl = mod.querySelector('.lc.s') as HTMLElement;
    const fieldVal = sEl?.dataset?.field || sEl?.getAttribute('data-field') || '';
    const modHash = fieldVal.startsWith('stat.') ? fieldVal.slice(5) : fieldVal;
    if (!modHash) return;

    mod.dataset.hash = modHash;
    const rowId = getRowId(mod);
    if (rowId) mod.dataset.rowid = rowId;

    const isInFilters = ISGs.some((isg: any) => isg.filters && isg.filters.some((f: any) => f.id === modHash));
    if (isInFilters) {
      mod.classList.add('finer-filtered');
      if (!mod.querySelector('.finer-filtered-overlay')) {
        const overlay = filteredOverlay();
        if (overlay) mod.appendChild(overlay);
      }
    } else {
      mod.classList.add('finer-filterable');
    }

    attachButtons(mod);
  };

  const scanVisibleMods = (root: ParentNode = document) => {
    const ISGs = ItemSearchGroupsVueItems();
    Array.from(root.querySelectorAll(modSelectors) as NodeListOf<HTMLElement>).forEach((mod) => {
      decorateMod(mod, ISGs);
    });
  };

  // step 1: hover a result row -> check filters
  onEnter('.resultset > .row, .resultset > .result-item, .search-results .result-item, .search-results .row', (e: any, row: HTMLElement) => {
    if (row.classList.contains('finer-processed')) return;
    
    // Check if the vue app exists
    if (!getApp()) {
      console.warn("[Krox-MainWorld] Vue 'window.app' not found. Is this PoE 2 Trade?");
    }

      const mods = Array.from(row.querySelectorAll(modSelectors)) as HTMLElement[];
      const ISGs = ItemSearchGroupsVueItems();

      mods.forEach((mod) => decorateMod(mod, ISGs));

      row.classList.add('finer-processed');
    });

  // step 2: make buttons visible on item mods
  scanVisibleMods();
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches?.(modSelectors)) {
          decorateMod(node, ItemSearchGroupsVueItems());
        }
        scanVisibleMods(node);
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // step 3: click ± inside the buttons → delegate to adapter (magic UX preserved)
  on('click', '[data-action="add-filter"]', async (_e: Event, el: HTMLElement) => {
    const hash = el.closest('#btns-finer')?.getAttribute('data-hash') || '';
    if (hash) await poeTradeAdapter.addStatFilter(hash, 'include');
  });
  on('click', '[data-action="rmv-filter"]', async (_e: Event, el: HTMLElement) => {
    const hash = el.closest('#btns-finer')?.getAttribute('data-hash') || '';
    if (hash) await poeTradeAdapter.addStatFilter(hash, 'exclude');
  });

  // listener for actions dispatched from the Svelte sidebar → delegate to adapter
  document.addEventListener('krox-finer-action', async (e: CustomEvent) => {
    const detail = e.detail;
    if (!detail) return;

    if (detail.action === 'global-plus' || detail.action === 'global-minus') {
      const action = detail.action === 'global-plus' ? 'plus' : 'minus';
      const types = (detail.types || '').split(',').filter(Boolean);
      const prefix = detail.prefix || 'pseudo.pseudo_';
      await poeTradeAdapter.applyGlobalFilterAction(types, prefix, action);
    }
  });

  // Preserve Trade Plus behavior on the native trade-site search fields.
  const findTradeSearchInput = (target: EventTarget | null): HTMLInputElement | null => {
    if (!(target instanceof Element)) return null;

    const input = target.closest('input.multiselect__input');
    return input instanceof HTMLInputElement ? input : null;
  };

  const setNativeInputValue = (input: HTMLInputElement, value: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    descriptor?.set?.call(input, value);
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
      const canUseRangeText = typeof input.setRangeText === 'function' && start !== null && end !== null;

      if (canUseRangeText) {
        input.setRangeText('~', 0, 0, 'preserve');
      } else {
        setNativeInputValue(input, `~${value}`);
        input.setSelectionRange(start + 1, end + 1);
      }

      input.dispatchEvent(new Event('input', { bubbles: true }));
    } finally {
      queueMicrotask(() => {
        prefixingInputs.delete(input);
      });
    }
  };

  document.addEventListener('input', (e: Event) => {
    const input = findTradeSearchInput(e.target);
    if (!input) return;
    const inputEvent = e as InputEvent;
    if (inputEvent.isComposing) return;
    ensureRegexPrefix(input, inputEvent.inputType);
  }, true);



}
