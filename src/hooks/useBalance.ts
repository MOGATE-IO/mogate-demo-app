import { useMemo } from 'react';

import { useWalletConnectionStore } from '@/stores/walletConnectionStore';
import { formatUsd } from '@/utils/format';

export function useBalance() {
  const balance = useWalletConnectionStore((state) => state.snapshot.balance);

  return useMemo(
    () => ({
      balance,
      formattedTotal: formatUsd(balance?.totalAmountInUSD),
      assets: balance?.assets ?? []
    }),
    [balance]
  );
}
