import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FINER_ACTION_MESSAGE,
  FINER_ACTION_SOURCE,
  dispatchFinerAction,
  onFinerAction,
} from './finer-action-bus';

type MockMessageEvent = {
  source: MockWindow;
  data?: unknown;
};

type MockWindow = {
  postMessage: ReturnType<typeof vi.fn>;
  addEventListener: (type: string, listener: (event: MockMessageEvent) => void) => void;
  removeEventListener: (type: string, listener: (event: MockMessageEvent) => void) => void;
};

function installMockWindow() {
  const listeners = new Map<string, Set<(event: MockMessageEvent) => void>>();
  const win: MockWindow = {
    postMessage: vi.fn((data: unknown) => {
      for (const listener of listeners.get('message') ?? []) {
        listener({ source: win, data });
      }
    }),
    addEventListener: (type, listener) => {
      const bucket = listeners.get(type) ?? new Set();
      bucket.add(listener);
      listeners.set(type, bucket);
    },
    removeEventListener: (type, listener) => {
      listeners.get(type)?.delete(listener);
    },
  };

  vi.stubGlobal('window', win);
  return win;
}

beforeEach(() => {
  installMockWindow();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('finer-action-bus', () => {
  it('delivers preset actions via window.postMessage', () => {
    const handler = vi.fn();
    const remove = onFinerAction(handler);

    dispatchFinerAction({
      action: 'global-plus',
      types: 'life,cold',
      prefix: 'pseudo.pseudo_',
    });

    expect(handler).toHaveBeenCalledWith({
      action: 'global-plus',
      types: 'life,cold',
      prefix: 'pseudo.pseudo_',
    });

    remove();
  });

  it('ignores unrelated postMessage payloads', () => {
    const handler = vi.fn();
    let messageListener: ((event: MockMessageEvent) => void) | undefined;
    const win = installMockWindow();
    win.addEventListener = vi.fn((_, listener) => {
      messageListener = listener;
    });

    const remove = onFinerAction(handler);
    messageListener?.({
      source: win,
      data: { source: 'other', type: FINER_ACTION_MESSAGE, detail: {} },
    });

    expect(handler).not.toHaveBeenCalled();
    remove();
  });

  it('tags messages with the extension source', () => {
    dispatchFinerAction({ action: 'global-minus', types: 'life', prefix: 'pseudo.pseudo_' });

    expect(window.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ source: FINER_ACTION_SOURCE, type: FINER_ACTION_MESSAGE }),
      '*',
    );
  });
});