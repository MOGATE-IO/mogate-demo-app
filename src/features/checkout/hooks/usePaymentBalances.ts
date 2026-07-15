import { useCallback, useEffect, useMemo, useState } from 'react';

import type { UnifiedBalance } from '@/@web3/types/wallet';
import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import {
  loadStablecoinRouteBalances,
  mergeStablecoinPortfolio,
  type NativeBalanceRow,
  type StablecoinBalanceRow
} from '@/features/checkout/services/paymentBalances';
import { toErrorMessage } from '@/utils/errors';

type PaymentBalanceStatus = 'idle' | 'loading' | 'ready' | 'error';

export function usePaymentBalances(input: {
  ownerAddress?: string | null;
  particleBalance?: UnifiedBalance | null;
  profile: RuntimeNetworkProfile;
}) {
  const [status, setStatus] = useState<PaymentBalanceStatus>('idle');
  const [exactRows, setExactRows] = useState<StablecoinBalanceRow[]>([]);
  const [nativeRows, setNativeRows] = useState<NativeBalanceRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const ownerAddress = input.ownerAddress?.trim();
    if (!ownerAddress) {
      setStatus('idle');
      setExactRows([]);
      setNativeRows([]);
      setErrors([]);
      return;
    }

    setStatus('loading');
    setErrors([]);
    try {
      const result = await loadStablecoinRouteBalances(
        input.profile.stablecoinRoutes,
        ownerAddress
      );
      setExactRows(result.rows);
      setNativeRows(result.nativeRows);
      setErrors(result.errors);
      setStatus(result.rows.length > 0 ? 'ready' : 'error');
    } catch (error) {
      setStatus('error');
      setErrors([toErrorMessage(error)]);
    }
  }, [input.ownerAddress, input.profile]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const portfolio = useMemo(
    () => mergeStablecoinPortfolio({
      particleAssets: input.particleBalance?.assets ?? [],
      exactRows,
      targetChainId: input.profile.ua.targetChainId
    }),
    [exactRows, input.particleBalance, input.profile.ua.targetChainId]
  );
  const targetNative = nativeRows.find(
    (row) => row.chainId === input.profile.ua.targetChainId
  ) ?? null;

  return {
    status,
    portfolio,
    nativeRows,
    targetNative,
    errors,
    refresh
  };
}

export type PaymentBalancesState = ReturnType<typeof usePaymentBalances>;
