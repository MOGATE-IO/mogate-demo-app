import { useCallback, useMemo } from 'react';

import { createPlannedSignerAdapter } from '@/providers/planned/createPlannedSignerAdapter';
import { useWalletConnectionStore } from '@/stores/walletConnectionStore';
import type { WalletAdapter, WalletStack } from '@/types/wallet';
import { toErrorMessage } from '@/utils/errors';

type UseUniversalWalletOptions = {
  privyAdapter?: WalletAdapter | null;
};

export function useUniversalWallet(options: UseUniversalWalletOptions = {}) {
  const { selectedStack, setSelectedStack, setSnapshot, snapshot } = useWalletConnectionStore();

  const adapter = useMemo<WalletAdapter | null>(() => {
    if (selectedStack === 'magic' || selectedStack === 'dynamic' || selectedStack === 'particle') {
      return createPlannedSignerAdapter(selectedStack);
    }
    return options.privyAdapter ?? null;
  }, [options.privyAdapter, selectedStack]);

  const switchStack = useCallback(
    (stack: WalletStack) => {
      setSelectedStack(stack);
    },
    [setSelectedStack]
  );

  const connect = useCallback(async () => {
    if (!adapter) {
      setSnapshot({
        stack: selectedStack,
        status: 'unsupported',
        lastError: 'Selected wallet adapter is not mounted.'
      });
      return;
    }

    if (adapter.isReady === false) {
      setSnapshot({
        stack: selectedStack,
        status: 'idle',
        lastError: null
      });
      return;
    }

    setSnapshot({ stack: selectedStack, status: 'connecting', lastError: null });
    try {
      const nextSnapshot = await adapter.connect();
      setSnapshot(nextSnapshot);
    } catch (error) {
      setSnapshot({
        stack: selectedStack,
        status: 'error',
        lastError: toErrorMessage(error)
      });
    }
  }, [adapter, selectedStack, setSnapshot]);

  const refresh = useCallback(async () => {
    if (!adapter) return;
    if (adapter.isReady === false) return;
    try {
      setSnapshot(await adapter.refresh());
    } catch (error) {
      setSnapshot({
        status: 'error',
        lastError: toErrorMessage(error)
      });
    }
  }, [adapter, setSnapshot]);

  const disconnect = useCallback(async () => {
    if (!adapter) return;
    await adapter.disconnect();
    setSnapshot({
      status: 'idle',
      address: null,
      ownerAddress: null,
      evmUaAddress: null,
      solanaUaAddress: null,
      linkedSolanaAddress: null,
      balance: null,
      identity: null,
      lastError: null
    });
  }, [adapter, setSnapshot]);

  return {
    adapter,
    isAdapterReady: Boolean(adapter && adapter.isReady !== false),
    snapshot,
    selectedStack,
    switchStack,
    connect,
    refresh,
    disconnect
  };
}
