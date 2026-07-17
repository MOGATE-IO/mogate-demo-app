import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchWithTimeout, withTimeout } from '../src/utils/async';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('bounded async operations', () => {
  it('turns a stalled operation into a visible deadline error', async () => {
    await expect(
      withTimeout(new Promise<never>(() => undefined), 5, 'Checkout timed out.')
    ).rejects.toThrow('Checkout timed out.');
  });

  it('aborts a stalled fetch and reports the caller recovery message', async () => {
    vi.stubGlobal('fetch', vi.fn((_input, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    })));

    await expect(
      fetchWithTimeout('/checkout', undefined, 5, 'Checkout service is unavailable.')
    ).rejects.toThrow('Checkout service is unavailable.');
  });
});
