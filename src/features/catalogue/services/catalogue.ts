import type { RuntimeNetworkProfile } from '@/config/networkProfiles';

export type GiftcardMerchant = {
  id: string;
  name: string;
  category: string;
  description: string;
  heroColor: readonly [string, string, string];
  availableAmounts: number[];
  currency: string;
  views: number;
  recentPurchases: number;
  trendingRank?: number;
  chains: string[];
};

export const FALLBACK_GIFTCARD_CATALOGUE: GiftcardMerchant[] = [
  {
    id: 'mogate',
    name: 'Mogate Giftcard',
    category: 'Mogate',
    description: 'Tiny funded giftcard smoke test for the UA Arbitrum checkout path.',
    heroColor: ['#ffffff', '#fff1c9', '#dff2ff'],
    availableAmounts: [0.1, 1, 5, 10],
    currency: 'USD',
    views: 2100,
    recentPurchases: 64,
    trendingRank: 1,
    chains: ['Arbitrum']
  },
  {
    id: 'wholefoods',
    name: 'Whole Foods',
    category: 'Groceries',
    description: 'Fresh food and everyday grocery balance for funded giftcards.',
    heroColor: ['#ffffff', '#dcf5e7', '#b9d9ff'],
    availableAmounts: [25, 50, 100, 300],
    currency: 'USD',
    views: 1280,
    recentPurchases: 48,
    trendingRank: 2,
    chains: ['Arbitrum', 'Base']
  },
  {
    id: 'uber',
    name: 'Uber',
    category: 'Mobility',
    description: 'Ride credit that can be minted as a funded NFT and transferred later.',
    heroColor: ['#ffffff', '#f1e4ff', '#cfecff'],
    availableAmounts: [15, 25, 50, 100],
    currency: 'USD',
    views: 940,
    recentPurchases: 35,
    trendingRank: 3,
    chains: ['Arbitrum']
  },
  {
    id: 'apple',
    name: 'Apple',
    category: 'Digital',
    description: 'Digital store value for hardware, apps, subscriptions, and media.',
    heroColor: ['#ffffff', '#e9edf4', '#cdd7e7'],
    availableAmounts: [25, 50, 100, 200],
    currency: 'USD',
    views: 870,
    recentPurchases: 29,
    trendingRank: 4,
    chains: ['Arbitrum', 'Ethereum']
  },
  {
    id: 'airbnb',
    name: 'Airbnb',
    category: 'Travel',
    description: 'Travel credit designed for gifting and marketplace resale.',
    heroColor: ['#ffffff', '#ffe2e6', '#d9efff'],
    availableAmounts: [50, 100, 250, 500],
    currency: 'USD',
    views: 710,
    recentPurchases: 17,
    chains: ['Arbitrum']
  }
];

function normalizeMerchant(raw: any): GiftcardMerchant {
  return {
    id: String(raw.id ?? raw.slug ?? raw.name).toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    name: String(raw.name ?? 'Unnamed merchant'),
    category: String(raw.category ?? 'Giftcard'),
    description: String(raw.description ?? raw.subtitle ?? ''),
    heroColor: Array.isArray(raw.heroColor) && raw.heroColor.length >= 3
      ? [String(raw.heroColor[0]), String(raw.heroColor[1]), String(raw.heroColor[2])]
      : ['#ffffff', '#e8f2ff', '#f4e4ff'],
    availableAmounts: Array.isArray(raw.availableAmounts ?? raw.amounts)
      ? (raw.availableAmounts ?? raw.amounts).map((amount: unknown) => Number(amount)).filter(Boolean)
      : [25, 50, 100],
    currency: String(raw.currency ?? 'USD'),
    views: Number(raw.views ?? 0),
    recentPurchases: Number(raw.recentPurchases ?? raw.recent_purchases ?? 0),
    trendingRank: raw.trendingRank ?? raw.trending_rank,
    chains: Array.isArray(raw.chains) ? raw.chains.map(String) : []
  };
}

function ensureLocalSmokeTest(items: GiftcardMerchant[]) {
  const hasMogate = items.some((item) => item.id === 'mogate');
  if (hasMogate) return items;
  return [FALLBACK_GIFTCARD_CATALOGUE[0], ...items];
}

export async function fetchGiftcardCatalogue(profile: RuntimeNetworkProfile): Promise<GiftcardMerchant[]> {
  if (!profile.catalogueEndpoint) return FALLBACK_GIFTCARD_CATALOGUE;

  const response = await fetch(profile.catalogueEndpoint);
  if (!response.ok) {
    throw new Error(`Catalogue endpoint failed ${response.status}: ${await response.text()}`);
  }

  const body = (await response.json()) as any;
  const rows = Array.isArray(body) ? body : body.items ?? body.merchants ?? body.catalogue ?? [];
  if (!Array.isArray(rows)) return FALLBACK_GIFTCARD_CATALOGUE;
  return ensureLocalSmokeTest(rows.map(normalizeMerchant));
}
