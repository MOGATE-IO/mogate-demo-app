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

function normalizeMerchant(raw: any, index: number): GiftcardMerchant {
  const name = raw.name == null ? '' : String(raw.name);
  if (!name) {
    throw new Error(`Catalogue row ${index + 1} is missing name.`);
  }

  const rawAmounts = raw.availableAmounts ?? raw.amounts;
  const availableAmounts = Array.isArray(rawAmounts)
    ? rawAmounts.map((amount: unknown) => Number(amount)).filter((amount) => Number.isFinite(amount) && amount > 0)
    : [];
  if (availableAmounts.length === 0) {
    throw new Error(`Catalogue row ${name} is missing availableAmounts.`);
  }

  return {
    id: String(raw.id ?? raw.slug ?? name).toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    name,
    category: String(raw.category ?? 'Giftcard'),
    description: String(raw.description ?? raw.subtitle ?? ''),
    heroColor: Array.isArray(raw.heroColor) && raw.heroColor.length >= 3
      ? [String(raw.heroColor[0]), String(raw.heroColor[1]), String(raw.heroColor[2])]
      : ['#ffffff', '#e8f2ff', '#f4e4ff'],
    availableAmounts,
    currency: String(raw.currency ?? 'USD'),
    views: Number(raw.views ?? 0),
    recentPurchases: Number(raw.recentPurchases ?? raw.recent_purchases ?? 0),
    trendingRank: raw.trendingRank ?? raw.trending_rank,
    chains: Array.isArray(raw.chains) ? raw.chains.map(String) : []
  };
}

export async function fetchGiftcardCatalogue(profile: RuntimeNetworkProfile): Promise<GiftcardMerchant[]> {
  if (!profile.catalogueEndpoint) {
    throw new Error('Catalogue API path is not configured.');
  }

  const response = await fetch(profile.catalogueEndpoint);
  if (!response.ok) {
    throw new Error(`Catalogue endpoint failed ${response.status}: ${await response.text()}`);
  }

  const body = (await response.json()) as any;
  const rows = Array.isArray(body) ? body : body.items ?? body.merchants ?? body.catalogue ?? [];
  if (!Array.isArray(rows)) {
    throw new Error('Catalogue endpoint response must be an array or contain items/merchants/catalogue.');
  }
  return rows.map(normalizeMerchant);
}
