import { afterEach, describe, expect, it, vi } from 'vitest';

import { getNetworkProfile } from '../src/config/networkProfiles';
import {
  fetchGiftcardCatalogueProgressively,
  mergeGiftcardCatalogues,
  type GiftcardMerchant
} from '../src/features/catalogue/services/catalogue';

const profile = getNetworkProfile('mainnet');

function response(items: unknown[]) {
  return new Response(JSON.stringify({ items }), { status: 200 });
}

function brand(input: { id: string; brandId: string; name: string; provider: string }) {
  return {
    id: input.id,
    brand_id: input.brandId,
    name: input.name,
    provider: input.provider,
    provider_brand_key: `${input.provider}:${input.brandId}`,
    countries: ['ALL'],
    category: 'Giftcard',
    price_options: [5, 10]
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('progressive catalogue loading', () => {
  it('publishes internal brands before requesting Reloadly and then merges both sources', async () => {
    const internal = [
      brand({ id: 'moga_lezgo_travel', brandId: 'lezgo_travel', name: 'Lezgo Travel', provider: 'internal' }),
      brand({ id: 'moga_mogate', brandId: 'mogate', name: 'Mogate', provider: 'internal' })
    ];
    const reloadly = [
      brand({ id: 'reloadly:379', brandId: '379', name: 'Starbucks', provider: 'reloadly' })
    ];
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(internal))
      .mockResolvedValueOnce(response(reloadly));
    vi.stubGlobal('fetch', fetchMock);
    const staged: string[][] = [];

    const result = await fetchGiftcardCatalogueProgressively(
      profile,
      { country: 'US' },
      { onInternal: (items) => staged.push(items.map((item) => item.name)) }
    );

    expect(staged).toEqual([['Lezgo Travel', 'Mogate']]);
    expect(result.items.map((item) => item.name)).toEqual(['Lezgo Travel', 'Mogate', 'Starbucks']);
    expect(result.providerWarning).toBeNull();
    expect(String(fetchMock.mock.calls[0][0])).toContain('provider=internal');
    expect(String(fetchMock.mock.calls[0][0])).toContain('country=US');
    expect(String(fetchMock.mock.calls[1][0])).toContain('provider=reloadly');
    expect(String(fetchMock.mock.calls[1][0])).toContain('country=US');
  });

  it('keeps internal brands usable when Reloadly fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response([
        brand({ id: 'moga_mogate', brandId: 'mogate', name: 'Mogate', provider: 'internal' })
      ]))
      .mockRejectedValueOnce(new Error('Reloadly unavailable')));

    const result = await fetchGiftcardCatalogueProgressively(profile);

    expect(result.items.map((item) => item.name)).toEqual(['Mogate']);
    expect(result.providerWarning).toContain('external giftcards');
  });

  it('fails only when neither source provides a usable item', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockRejectedValueOnce(new Error('Internal unavailable'))
      .mockRejectedValueOnce(new Error('Reloadly unavailable')));

    await expect(fetchGiftcardCatalogueProgressively(profile)).rejects.toThrow('Internal unavailable');
  });

  it('deduplicates catalogue rows by provider brand key', () => {
    const merchant = {
      id: 'mogate',
      backendBrandId: 'mogate',
      provider: 'internal',
      providerBrandKey: 'internal:mogate',
      regions: ['GLOBAL'],
      name: 'Mogate',
      category: 'FinTech',
      description: '',
      heroColor: ['#fff5ed', '#ffd3c2', '#eadfff'],
      availableAmounts: [5],
      currency: 'USD',
      views: 0,
      recentPurchases: 0,
      chains: []
    } satisfies GiftcardMerchant;

    expect(mergeGiftcardCatalogues([merchant], [{ ...merchant, views: 10 }])).toEqual([
      { ...merchant, views: 10 }
    ]);
  });
});
