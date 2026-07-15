import { useMemo, useState } from 'react';

import type { GiftcardMerchant } from '@/features/catalogue/services/catalogue';

export function useCatalogueSelection() {
  const [selected, setSelected] = useState<GiftcardMerchant | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [region, setRegion] = useState<string | null>(null);

  const selectedAmount = useMemo(
    () => (selected ? amount ?? selected.availableAmounts[0] ?? null : null),
    [amount, selected]
  );

  function selectMerchant(merchant: GiftcardMerchant) {
    setSelected(merchant);
    setAmount(merchant.availableAmounts[0] ?? null);
    setRegion(merchant.country ?? merchant.regions[0] ?? 'GLOBAL');
  }

  function clearSelection() {
    setSelected(null);
    setAmount(null);
    setRegion(null);
  }

  return {
    amount,
    region,
    selected,
    selectedAmount,
    setAmount,
    setRegion,
    selectMerchant,
    clearSelection
  };
}
