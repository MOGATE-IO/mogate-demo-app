import { useEffect, useMemo, useState } from 'react';

import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import {
  FALLBACK_GIFTCARD_CATALOGUE,
  fetchGiftcardCatalogue,
  type GiftcardMerchant
} from '@/services/catalogue';
import { toErrorMessage } from '@/utils/errors';

export function useGiftcardCatalogue(profile: RuntimeNetworkProfile) {
  const [items, setItems] = useState<GiftcardMerchant[]>(FALLBACK_GIFTCARD_CATALOGUE);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLastError(null);
      try {
        const next = await fetchGiftcardCatalogue(profile);
        if (!cancelled) setItems(next);
      } catch (error) {
        if (!cancelled) setLastError(toErrorMessage(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [profile]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.name, item.category, item.description, ...item.chains]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [items, query]);

  const trending = useMemo(
    () =>
      [...items]
        .sort((left, right) => (left.trendingRank ?? 999) - (right.trendingRank ?? 999))
        .slice(0, 3),
    [items]
  );

  return {
    items,
    filtered,
    trending,
    query,
    setQuery,
    loading,
    lastError
  };
}
