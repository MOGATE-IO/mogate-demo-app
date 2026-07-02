import { useMemo, useState } from 'react';

import type { GiftcardMerchant } from '@/features/catalogue/services/catalogue';

export function useCatalogueSelection() {
  const [selected, setSelected] = useState<GiftcardMerchant | null>(null);
  const [amount, setAmount] = useState<number | null>(null);

  const selectedAmount = useMemo(
    () => (selected ? amount ?? selected.availableAmounts[0] ?? 25 : null),
    [amount, selected]
  );

  function selectMerchant(merchant: GiftcardMerchant) {
    setSelected(merchant);
    setAmount(merchant.availableAmounts[0] ?? null);
  }

  function clearSelection() {
    setSelected(null);
    setAmount(null);
  }

  return {
    amount,
    selected,
    selectedAmount,
    setAmount,
    selectMerchant,
    clearSelection
  };
}
