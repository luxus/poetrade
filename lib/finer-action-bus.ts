/**
 * Cross-world bridge for Finer Filters preset actions.
 *
 * FinerFilters.svelte runs in the isolated sidebar content script; filter-panel
 * runs in MAIN world (needs window.app). CustomEvent on document does not cross
 * those worlds — window.postMessage does.
 */

export const FINER_ACTION_MESSAGE = 'krox-finer-action' as const;
export const FINER_ACTION_SOURCE = 'poe-trade-plus' as const;

export type FinerActionName = 'global-plus' | 'global-minus';

export interface FinerActionDetail {
  action: FinerActionName;
  types: string;
  prefix: string;
}

export function dispatchFinerAction(detail: FinerActionDetail): void {
  window.postMessage(
    { source: FINER_ACTION_SOURCE, type: FINER_ACTION_MESSAGE, detail },
    '*',
  );
}

export function onFinerAction(handler: (detail: FinerActionDetail) => void): () => void {
  const listener = (rawEvent: Event) => {
    const event = rawEvent as Event & { source?: unknown; data?: unknown };
    if (event.source !== window) return;
    const data = event.data as {
      source?: string;
      type?: string;
      detail?: FinerActionDetail;
    };
    if (data?.source !== FINER_ACTION_SOURCE || data?.type !== FINER_ACTION_MESSAGE) return;
    if (!data.detail?.action) return;
    handler(data.detail);
  };

  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}