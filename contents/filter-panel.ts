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
  if ((window as any).__KROX_STARTED__) {  // eslint-disable-line @typescript-eslint/no-explicit-any
    return;
  }
  (window as any).__KROX_STARTED__ = true;  // eslint-disable-line @typescript-eslint/no-explicit-any

  // ---------- pure DOM helpers (no site knowledge) ----------
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

  // Preset list lives in FinerFilters.svelte (the UI side). The global actions are delegated via events to adapter.

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

  // ---------- result mod decoration & button injection (ultra thin - all site logic in adapter) ----------
  const scanVisibleMods = (root: ParentNode = document) => {
    poeTradeAdapter.scanVisibleMods(root);
    // After scan (which prepares/decors), attach buttons using adapter's attach
    Array.from(root.querySelectorAll(poeTradeAdapter.getModSelectors()) as NodeListOf<HTMLElement>).forEach((mod) => {
      const btns = buttonsTemplate();
      if (btns) {
        poeTradeAdapter.attachFilterButtons(mod, btns);
        // Overlay for filtered (UI only)
        if (mod.classList.contains('finer-filtered') && !mod.querySelector('.finer-filtered-overlay')) {
          const o = filteredOverlay();
          if (o) mod.appendChild(o);
        }
      }
    });
  };

  // Hover a result row → let adapter handle decoration, then attach buttons
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

    if (!poeTradeAdapter.hasSiteApp() && !poeTradeAdapter.isMagicSupported?.()) {  // adapter may expose
      console.warn('[Krox] Site app not found – PoE2 or major site change?');
    }

    const mods = Array.from(row.querySelectorAll(poeTradeAdapter.getModSelectors()) as NodeListOf<HTMLElement>);
    mods.forEach((mod) => {
      poeTradeAdapter.prepareAndDecorateModForFinerButtons(mod);
      const btns = buttonsTemplate();
      if (btns) {
        poeTradeAdapter.attachFilterButtons(mod, btns);
        if (mod.classList.contains('finer-filtered') && !mod.querySelector('.finer-filtered-overlay')) {
          const o = filteredOverlay();
          if (o) mod.appendChild(o);
        }
      }
    });
    row.classList.add('finer-processed');
  });

  // Initial pass + observer
  scanVisibleMods();

  let layoutRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  const refreshButtonsForLayout = () => {
    if (layoutRefreshTimer) clearTimeout(layoutRefreshTimer);
    layoutRefreshTimer = setTimeout(() => {
      scanVisibleMods();
      layoutRefreshTimer = null;
    }, 80);
  };

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches?.(poeTradeAdapter.getModSelectors())) {
          poeTradeAdapter.prepareAndDecorateModForFinerButtons(node);
          const btns = buttonsTemplate();
          if (btns) poeTradeAdapter.attachFilterButtons(node, btns);
        }
        scanVisibleMods(node);
      });
    }
    // javijec-style refresh after layout-affecting mutations (e.g. our sidebar changes)
    refreshButtonsForLayout();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Click handlers definition (must be before use)
  const on = (type: string, selector: string, handler: (e: Event, el: HTMLElement) => void) => {
    document.addEventListener(type, (e: Event) => {
      const el = (e.target as HTMLElement | null)?.closest(selector) as HTMLElement | null;
      if (!el) return;
      handler(e, el);
    });
  };

  // Hook to layout changes if layout buttons exist (from javijec improvement)
  on('click', '.layout-btn, [class*="layout"]', () => {
    refreshButtonsForLayout();
    setTimeout(refreshButtonsForLayout, 220);
  });

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