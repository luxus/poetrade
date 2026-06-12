/** Shared DOM helpers for Finer Filters mod decoration (no Vue/site internals). */

export const MOD_SELECTORS =
  '.item-popup__content .item-mod, .itemBoxContent > .content > div, .content [class*="Mod"], .item-stats .stat-line, .search-results .result-item .item-mod';

export function extractHashFromMod(mod: HTMLElement): string {
  const sEl = mod.querySelector('.lc.s') as HTMLElement | null;
  const fieldVal =
    sEl?.dataset?.field || sEl?.getAttribute('data-field') || mod.dataset.hash || '';
  return fieldVal.startsWith('stat.') ? fieldVal.slice(5) : fieldVal;
}

export function getRowIdFromMod(mod: HTMLElement): string {
  const row = mod.closest('[data-id]') as HTMLElement | null;
  return row?.getAttribute('data-id') || row?.id || mod.dataset.rowid || '';
}

export function prepareModForButtons(mod: HTMLElement): void {
  const hash = extractHashFromMod(mod);
  if (hash) mod.dataset.hash = hash;
  const rowId = getRowIdFromMod(mod);
  if (rowId) mod.dataset.rowid = rowId;
}

export function attachFilterButtonsToMod(mod: HTMLElement, buttonsElement: HTMLElement): void {
  const stale = mod.querySelectorAll(':scope > .finer-mod-content, :scope > .finer-mod-actions');
  stale.forEach((wrapper) => {
    while (wrapper.firstChild) mod.insertBefore(wrapper.firstChild, wrapper);
    wrapper.remove();
  });
  if (mod.querySelector('#btns-finer')) return;

  mod.style.overflow = 'visible';

  const hash = mod.dataset.hash;
  if (hash) buttonsElement.setAttribute('data-hash', hash);
  const rowId = mod.dataset.rowid;
  if (rowId) buttonsElement.setAttribute('data-rowid', rowId);

  const host = mod.querySelector('.lc.r.su, .lc.r.pr, .lc.r') as HTMLElement | null;
  const target = host || mod;
  target.appendChild(buttonsElement);

  if (host && (host.classList.contains('lc.r.su') || host.classList.contains('lc.r.pr'))) {
    buttonsElement.classList.add('finer-fixed-right');
  }
}