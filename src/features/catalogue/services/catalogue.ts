import type { RuntimeNetworkProfile } from '@/config/networkProfiles';

export type GiftcardMerchant = {
  id: string;
  backendBrandId: string;
  provider?: string;
  providerBrandKey?: string;
  productId?: number | string | null;
  country?: string;
  regions: string[];
  imageUrl?: string | null;
  isChoice?: boolean;
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

export type GiftcardCatalogueQuery = {
  country?: string;
  provider?: string;
};

function normalizeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function uniqueAmounts(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .flat()
        .map((amount) => Number(amount))
        .filter((amount) => Number.isFinite(amount) && amount > 0)
    )
  ).sort((left, right) => left - right);
}

function extractAmounts(raw: any) {
  const values = [
    raw.availableAmounts,
    raw.amounts,
    raw.price_options,
    raw.fixed_amounts,
    raw.valuesUSD,
    raw.min_amount,
    raw.max_amount
  ].filter((value) => value != null);

  return uniqueAmounts(values);
}

function defaultHeroColor(category: string): readonly [string, string, string] {
  const key = category.toLowerCase();
  if (key.includes('travel')) return ['#fff8d8', '#e7f7ff', '#efe1ff'];
  if (key.includes('food')) return ['#fff6dc', '#e7f9ed', '#dcefff'];
  if (key.includes('digital')) return ['#f6f7ff', '#e4f5ff', '#eee7ff'];
  if (key.includes('transport')) return ['#f7fbff', '#e9f5ff', '#dcecff'];
  return ['#ffffff', '#e8f2ff', '#f4e4ff'];
}

function normalizeMerchant(raw: any, index: number): GiftcardMerchant {
  const name = raw.name ?? raw.brand_name ?? raw.product_name ?? '';
  if (!name) {
    throw new Error(`Catalogue row ${index + 1} is missing name.`);
  }

  const availableAmounts = extractAmounts(raw);
  if (availableAmounts.length === 0) {
    throw new Error(`Catalogue row ${name} is missing availableAmounts.`);
  }

  const backendBrandId = String(raw.brand_id ?? raw.backendBrandId ?? raw.id ?? name);
  const category = String(raw.category ?? raw.category_name ?? 'Giftcard');
  const chainId = raw.chain_id == null ? null : Number(raw.chain_id);
  const chainLabel =
    chainId === 42161 || chainId === 421614
      ? 'Arbitrum'
      : chainId === 8453
        ? 'Base'
        : chainId === 1
          ? 'Ethereum'
          : null;
  const countries = Array.isArray(raw.countries) ? raw.countries.map(String) : [];
  const chains = Array.isArray(raw.chains)
    ? raw.chains.map(String)
    : chainLabel
      ? [chainLabel]
      : countries.length > 0
        ? countries
        : [];

  return {
    id: normalizeId(String(raw.id ?? backendBrandId ?? name)),
    backendBrandId,
    provider: raw.provider == null ? undefined : String(raw.provider),
    providerBrandKey: raw.provider_brand_key ?? raw.providerBrandKey,
    productId: raw.product_id ?? raw.productId ?? null,
    country: raw.default_region ?? raw.country_code ?? countries[0],
    regions: countries.length > 0
      ? countries
      : [raw.default_region ?? raw.country_code].filter(Boolean).map(String),
    imageUrl: raw.image_url ?? raw.logoUrl ?? raw.imageUrl ?? null,
    isChoice: Boolean(raw.is_choice ?? raw.isChoice),
    name: String(name),
    category,
    description: String(raw.description ?? raw.subtitle ?? raw.site_url ?? ''),
    heroColor: Array.isArray(raw.heroColor) && raw.heroColor.length >= 3
      ? [String(raw.heroColor[0]), String(raw.heroColor[1]), String(raw.heroColor[2])]
      : defaultHeroColor(category),
    availableAmounts,
    currency: String(raw.currency ?? 'USD'),
    views: Number(raw.views ?? raw.view_count ?? raw.raw_view_count ?? 0),
    recentPurchases: Number(raw.recentPurchases ?? raw.recent_purchases ?? raw.purchase_count ?? 0),
    trendingRank: raw.trendingRank ?? raw.trending_rank,
    chains
  };
}

function buildCatalogueUrl(profile: RuntimeNetworkProfile, query?: GiftcardCatalogueQuery) {
  const url = new URL(profile.catalogueEndpoint);
  const country = query?.country?.trim().toUpperCase();
  const provider = query?.provider?.trim();
  if (country && country !== 'GLOBAL' && country !== 'ALL') url.searchParams.set('country', country);
  if (provider) url.searchParams.set('provider', provider);
  return url.toString();
}

export async function fetchGiftcardCatalogue(
  profile: RuntimeNetworkProfile,
  query?: GiftcardCatalogueQuery
): Promise<GiftcardMerchant[]> {
  if (!profile.catalogueEndpoint) {
    throw new Error('Catalogue API path is not configured.');
  }

  const response = await fetch(buildCatalogueUrl(profile, query));
  if (!response.ok) {
    throw new Error(`Catalogue endpoint failed ${response.status}: ${await response.text()}`);
  }

  const body = (await response.json()) as any;
  const rows = Array.isArray(body) ? body : body.items ?? body.brands ?? body.merchants ?? body.catalogue ?? [];
  if (!Array.isArray(rows)) {
    throw new Error('Catalogue endpoint response must be an array or contain items/merchants/catalogue.');
  }
  return rows.map(normalizeMerchant);
}
