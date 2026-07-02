import { useMemo, useState } from 'react';
import * as Clipboard from 'expo-clipboard';

import {
  useWalletPortfolio
} from '@/features/profile/hooks/useWalletPortfolio';
import type { PortfolioNetworkKey } from '@/features/profile/services/walletPortfolio';
import { formatUsd } from '@/utils/format';

export type AccordionState = Record<PortfolioNetworkKey, boolean>;

const initialAccordionState: AccordionState = {
  arbitrum: true,
  ethereum: false,
  base: false,
  solana: false
};

export function useWalletProfile(input: {
  ownerAddress?: string | null;
  linkedSolanaAddress?: string | null;
  solanaUaAddress?: string | null;
  uaBalanceDisplay: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<AccordionState>(initialAccordionState);
  const ownerAddress = input.ownerAddress || '';
  const solanaAddress = input.linkedSolanaAddress || input.solanaUaAddress || '';
  const portfolio = useWalletPortfolio({
    evmAddress: ownerAddress,
    solanaAddress
  });

  const stablecoinTotal = useMemo(
    () => formatUsd(portfolio.loadedTotalUsd),
    [portfolio.loadedTotalUsd]
  );

  async function copyAddress(label: string, address?: string | null) {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopied(label);
    setTimeout(() => setCopied(null), 1400);
  }

  function toggleNetwork(network: PortfolioNetworkKey) {
    setExpanded((current) => ({
      ...current,
      [network]: !current[network]
    }));
  }

  return {
    copied,
    expanded,
    ownerAddress,
    portfolio,
    solanaAddress,
    stablecoinTotal,
    toggleNetwork,
    copyAddress,
    uaBalanceDisplay: input.uaBalanceDisplay
  };
}

export type WalletProfileState = ReturnType<typeof useWalletProfile>;
