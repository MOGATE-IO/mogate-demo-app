import { useCallback, useEffect, useMemo, useState } from 'react';

import type { UnifiedBalance } from '@/@web3/types/wallet';
import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import {
  loadStablecoinRouteBalances,
  loadSolanaBalanceRoute,
  mergeStablecoinPortfolio,
  type NativeBalanceRow,
  type StablecoinBalanceRow
} from '@/features/checkout/services/paymentBalances';
import { toErrorMessage } from '@/utils/errors';

type PaymentBalanceStatus = 'idle' | 'loading' | 'ready' | 'error';

export function usePaymentBalances(input: {
  ownerAddress?: string | null;
  solanaAddress?: string | null;
  particleBalance?: UnifiedBalance | null;
  profile: RuntimeNetworkProfile;
}) {
  const [status, setStatus] = useState<PaymentBalanceStatus>('idle');
  const [exactRows, setExactRows] = useState<StablecoinBalanceRow[]>([]);
  const [nativeRows, setNativeRows] = useState<NativeBalanceRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const ownerAddress = input.ownerAddress?.trim();
    const solanaAddress = input.solanaAddress?.trim();
    if (!ownerAddress && !solanaAddress) {
      setStatus('idle');
      setExactRows([]);
      setNativeRows([]);
      setErrors([]);
      return;
    }

    setStatus('loading');
    setErrors([]);
    try {
      const [evmResult, solanaResult] = await Promise.all([
        ownerAddress
          ? loadStablecoinRouteBalances(input.profile.stablecoinRoutes, ownerAddress)
          : Promise.resolve({ rows: [], nativeRows: [], errors: [] }),
        solanaAddress
          ? loadSolanaBalanceRoute(input.profile.solanaBalanceRoute, solanaAddress)
          : Promise.resolve({ rows: [], nativeRows: [], errors: [] })
      ]);
      const rows = [...evmResult.rows, ...solanaResult.rows];
      setExactRows(rows);
      setNativeRows([...evmResult.nativeRows, ...solanaResult.nativeRows]);
      setErrors([...evmResult.errors, ...solanaResult.errors]);
      setStatus(rows.length > 0 ? 'ready' : 'error');
    } catch (error) {
      setStatus('error');
      setErrors([toErrorMessage(error)]);
    }
  }, [input.ownerAddress, input.profile, input.solanaAddress]);

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
