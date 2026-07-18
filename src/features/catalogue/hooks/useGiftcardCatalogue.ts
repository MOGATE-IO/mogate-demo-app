import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import {
  fetchGiftcardCatalogueProgressively,
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
  const [providerLoading, setProviderLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [providerWarning, setProviderWarning] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isCurrent = () => requestIdRef.current === requestId;
    setLoading(true);
    setProviderLoading(true);
    setLastError(null);
    setProviderWarning(null);
    try {
      const result = await fetchGiftcardCatalogueProgressively(
        profile,
        { country },
        {
          onInternal: (internal) => {
            if (!isCurrent()) return;
            setItems(internal);
            if (internal.length > 0) setLoading(false);
          }
        }
      );
      if (!isCurrent()) return;
      setItems(result.items);
      setProviderWarning(result.providerWarning);
    } catch (error) {
      if (isCurrent()) {
        setItems([]);
        setLastError(toErrorMessage(error));
      }
    } finally {
      if (isCurrent()) {
        setLoading(false);
        setProviderLoading(false);
      }
    }
  }, [country, profile]);

  useEffect(() => {
    void load();

    return () => {
      requestIdRef.current += 1;
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
    providerLoading,
    lastError,
    providerWarning,
    reload: () => load()
  };
}
