import { afterEach, describe, expect, it, vi } from 'vitest';
import { PoeTradeSiteAdapter } from './poe-trade-adapter';
import { PoE1SiteStrategy } from './poe1-strategy';
import { PoE2SiteStrategy } from './poe2-strategy';

describe('PoeTradeSiteAdapter', () => {
  const originalLocation = globalThis.location;

  afterEach(() => {
    vi.stubGlobal('location', originalLocation);
  });

  it('selects PoE2 strategy on /trade2 URLs', () => {
    vi.stubGlobal('location', { pathname: '/trade2/search/poe2', href: 'https://www.pathofexile.com/trade2/search/poe2' });
    const adapter = new PoeTradeSiteAdapter();
    expect(adapter.getModSelectors()).toBe(new PoE2SiteStrategy().getModSelectors());
    expect(adapter.getStatHashForKey('life')).toBe(new PoE2SiteStrategy().getStatHashForKey('life'));
  });

  it('selects PoE1 strategy on /trade URLs', () => {
    vi.stubGlobal('location', { pathname: '/trade/search/keepler', href: 'https://www.pathofexile.com/trade/search/keepler' });
    const adapter = new PoeTradeSiteAdapter();
    expect(adapter.getModSelectors()).toBe(new PoE1SiteStrategy().getModSelectors());
  });

  it('switchStrategy re-reads location', () => {
    vi.stubGlobal('location', { pathname: '/trade/search/keepler', href: 'https://www.pathofexile.com/trade/search/keepler' });
    const adapter = new PoeTradeSiteAdapter();
    expect(adapter.getModSelectors()).toBe(new PoE1SiteStrategy().getModSelectors());

    vi.stubGlobal('location', { pathname: '/trade2/search/poe2', href: 'https://www.pathofexile.com/trade2/search/poe2' });
    adapter.switchStrategy();
    expect(adapter.getModSelectors()).toBe(new PoE2SiteStrategy().getModSelectors());
  });
});