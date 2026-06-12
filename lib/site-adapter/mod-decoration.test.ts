import { describe, expect, it } from 'vitest';
import {
  attachFilterButtonsToMod,
  extractHashFromMod,
  prepareModForButtons,
} from './mod-decoration';

function mockMod(opts: {
  field?: string;
  hash?: string;
  rowid?: string;
  rowDataId?: string;
}): HTMLElement {
  const mod = {
    dataset: { hash: opts.hash, rowid: opts.rowid } as Record<string, string | undefined>,
    style: {} as Record<string, string>,
    querySelector: (sel: string) => {
      if (sel === '.lc.s' && opts.field) {
        return {
          dataset: { field: opts.field },
          getAttribute: (name: string) => (name === 'data-field' ? opts.field! : null),
        };
      }
      if (sel === '#btns-finer') return null;
      if (sel.startsWith(':scope')) return { forEach: () => {} };
      return null;
    },
    querySelectorAll: () => ({ forEach: () => {} }),
    closest: (sel: string) => {
      if (sel === '[data-id]' && opts.rowDataId) {
        return { getAttribute: (name: string) => (name === 'data-id' ? opts.rowDataId! : null), id: '' };
      }
      return null;
    },
    insertBefore: () => {},
    appendChild(child: unknown) {
      (this as { _child?: unknown })._child = child;
    },
  };
  return mod as unknown as HTMLElement;
}

describe('mod-decoration', () => {
  it('extracts hash from stat. prefixed data-field', () => {
    const mod = mockMod({ field: 'stat.3299347043' });
    expect(extractHashFromMod(mod)).toBe('3299347043');
  });

  it('prepareModForButtons stores hash and row id on the mod', () => {
    const mod = mockMod({ field: 'stat.abc123', rowDataId: 'row-42' });
    prepareModForButtons(mod);
    expect(mod.dataset.hash).toBe('abc123');
    expect(mod.dataset.rowid).toBe('row-42');
  });

  it('attachFilterButtonsToMod copies hash and rowid onto the button group', () => {
    const mod = mockMod({ hash: 'hash-1', rowid: 'row-9' });
    const attrs: Record<string, string> = {};
    const btns = {
      id: 'btns-finer',
      classList: { add: () => {} },
      setAttribute: (name: string, value: string) => { attrs[name] = value; },
      getAttribute: (name: string) => attrs[name] ?? null,
    } as unknown as HTMLElement;

    attachFilterButtonsToMod(mod, btns);

    expect(btns.getAttribute('data-hash')).toBe('hash-1');
    expect(btns.getAttribute('data-rowid')).toBe('row-9');
  });
});