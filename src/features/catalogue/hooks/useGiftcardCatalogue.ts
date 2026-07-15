import { useCallback, useEffect, useMemo, useState } from 'react';

import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import {
  fetchGiftcardCatalogue,
  type GiftcardMerchant
} from '@/features/catalogue/services/catalogue';
import { toErrorMessage } from '@/utils/errors';

const PAGE_SIZE = 12;
const DEFAULT_COUNTRY = 'GLOBAL';

export function useGiftcardCatalogue(profile: RuntimeNetworkProfile) {
  const [items, setItems] = useState<GiftcardMerchant[]>([]);
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const load = useCallback(
    async (options: { cancelled?: () => boolean } = {}) => {
      setLoading(true);
      setLastError(null);
      try {
        const next = await fetchGiftcardCatalogue(profile, { country });
        if (!options.cancelled?.()) setItems(next);
      } catch (error) {
        if (!options.cancelled?.()) {
          setItems([]);
          setLastError(toErrorMessage(error));
        }
      } finally {
        if (!options.cancelled?.()) setLoading(false);
      }
    },
    [country, profile]
  );

  useEffect(() => {
    let cancelled = false;

    void load({ cancelled: () => cancelled });

    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [country, profile, query]);

  const orderedItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        const leftPriority = (left.provider === 'internal' ? 20 : 0) + (left.isChoice ? 10 : 0);
        const rightPriority = (right.provider === 'internal' ? 20 : 0) + (right.isChoice ? 10 : 0);
        return (
          rightPriority - leftPriority ||
          right.views - left.views ||
          left.name.localeCompare(right.name)
        );
      }),
    [items]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return orderedItems;
    return orderedItems.filter((item) =>
      [item.name, item.category, item.description, ...item.chains]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [orderedItems, query]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const trending = useMemo(
    () =>
      [...items]
        .sort(
          (left, right) =>
            (left.trendingRank ?? 999) - (right.trendingRank ?? 999) ||
            right.views - left.views
        )
        .slice(0, 3),
    [items]
  );

  return {
    items: orderedItems,
    filtered,
    visible,
    totalFiltered: filtered.length,
    canLoadMore: visible.length < filtered.length,
    loadMore: () => setVisibleCount((current) => current + PAGE_SIZE),
    trending,
    country,
    setCountry,
    query,
    setQuery,
    loading,
    lastError,
    reload: () => load()
  };
}
