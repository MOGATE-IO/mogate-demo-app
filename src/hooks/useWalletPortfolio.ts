import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  loadNetworkBalance,
  PORTFOLIO_NETWORK_ORDER,
  type NetworkBalance,
  type PortfolioNetworkKey
} from '@/services/walletPortfolio';
import { toErrorMessage } from '@/utils/errors';

type NetworkBalanceState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: NetworkBalance | null;
  error: string | null;
};

const idleNetworkState: NetworkBalanceState = {
  status: 'idle',
  data: null,
  error: null
};

function createInitialState() {
  return PORTFOLIO_NETWORK_ORDER.reduce(
    (next, network) => ({
      ...next,
      [network]: idleNetworkState
    }),
    {} as Record<PortfolioNetworkKey, NetworkBalanceState>
  );
}

export function useWalletPortfolio(input: {
  evmAddress?: string | null;
  solanaAddress?: string | null;
}) {
  const [networks, setNetworks] = useState(createInitialState);

  useEffect(() => {
    setNetworks(createInitialState());
  }, [input.evmAddress, input.solanaAddress]);

  const load = useCallback(
    async (network: PortfolioNetworkKey) => {
      setNetworks((current) => ({
        ...current,
        [network]: {
          ...current[network],
          status: 'loading',
          error: null
        }
      }));

      try {
        const data = await loadNetworkBalance({
          network,
          evmAddress: input.evmAddress,
          solanaAddress: input.solanaAddress
        });
        setNetworks((current) => ({
          ...current,
          [network]: {
            status: 'ready',
            data,
            error: null
          }
        }));
      } catch (error) {
        setNetworks((current) => ({
          ...current,
          [network]: {
            ...current[network],
            status: 'error',
            error: toErrorMessage(error)
          }
        }));
      }
    },
    [input.evmAddress, input.solanaAddress]
  );

  useEffect(() => {
    if (!input.evmAddress) return;
    void load('arbitrum');
  }, [input.evmAddress, load]);

  const loadedTotalUsd = useMemo(
    () =>
      PORTFOLIO_NETWORK_ORDER.reduce(
        (sum, network) => sum + (networks[network].data?.totalUsd ?? 0),
        0
      ),
    [networks]
  );

  return {
    networks,
    loadedTotalUsd,
    load,
    refreshArbitrum: () => load('arbitrum')
  };
}
