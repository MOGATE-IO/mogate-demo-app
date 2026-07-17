import type { ComponentType } from 'react';
import { Separator, Skeleton, Tabs, Typography } from 'heroui-native';
import { CircleHelp } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import EthereumLogo from '@assets/+logos/ethereum-eth-logo.svg';
import ArbitrumLogo from '@assets/images/network/arbitrum-arb-logo.svg';
import SolanaLogo from '@assets/images/network/solana-sol-logo.svg';
import UsdcLogo from '@assets/images/token/usdc.svg';
import UsdtLogo from '@assets/images/token/usdt.svg';
import {
  formatTokenAmount,
  formatUsdAmount,
  type StablecoinBalanceRow,
  type StablecoinSymbol
} from '@/features/checkout/services/paymentBalances';

const TOKEN_LOGOS: Record<StablecoinSymbol, ComponentType<SvgProps>> = {
  USDC: UsdcLogo,
  USDT: UsdtLogo
};

export function StablecoinBalanceList({
  rows,
  selected,
  status,
  onSelect
}: {
  rows: StablecoinBalanceRow[];
  selected: StablecoinSymbol;
  status: 'idle' | 'loading' | 'ready' | 'error';
  onSelect: (symbol: StablecoinSymbol) => void;
}) {
  const supportedChains = Array.from(
    new Map(
      rows
        .filter((row) => row.chainId != null)
        .map((row) => [row.chainId, { chainId: row.chainId, chainLabel: row.chainLabel }])
    ).values()
  );
  const selectedRows = rows.filter((row) => row.symbol === selected);
  const visibleRows = supportedChains.length > 0
    ? supportedChains.map((chain) => selectedRows.find((row) => row.chainId === chain.chainId) ?? ({
        id: `${selected}-${chain.chainId}-unconfigured`,
        symbol: selected,
        chainId: chain.chainId,
        chainLabel: chain.chainLabel,
        tokenAddress: null,
        amount: 0,
        amountInUsd: 0
      } satisfies StablecoinBalanceRow))
    : selectedRows;

  return (
    <View style={styles.stack}>
      <Tabs onValueChange={(value) => onSelect(value as StablecoinSymbol)} value={selected} variant="primary">
        <Tabs.List className="self-start rounded-lg">
          <Tabs.Indicator />
          {(['USDC', 'USDT'] as const).map((symbol) => (
            <Tabs.Trigger key={symbol} value={symbol}>
              <TokenLogo size={20} symbol={symbol} />
              <Tabs.Label>{symbol}</Tabs.Label>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs>

      {status === 'loading' && visibleRows.length === 0 ? (
        <View style={styles.loadingRows}>
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
        </View>
      ) : visibleRows.length === 0 ? (
        <Typography color="muted" type="body-sm">
          No {selected} balance on the supported networks.
        </Typography>
      ) : (
        <View style={styles.rows}>
          {visibleRows.map((row, index) => (
            <View key={row.id}>
              {index > 0 ? <Separator /> : null}
              <View style={styles.row}>
                <NetworkLogo chainId={row.chainId} />
                <View style={styles.rowCopy}>
                  <Typography numberOfLines={1} weight="semibold">{row.chainLabel}</Typography>
                  <Typography color="muted" numberOfLines={1} type="body-xs">
                    {row.symbol}{row.tokenAddress ? '' : ' / not configured'}
                  </Typography>
                </View>
                <View style={styles.amountCopy}>
                  <Typography weight="semibold">{formatTokenAmount(row.amount)}</Typography>
                  <Typography color="muted" type="body-xs">{formatUsdAmount(row.amountInUsd)}</Typography>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function TokenLogo({
  size,
  symbol
}: {
  size: number;
  symbol: StablecoinSymbol;
}) {
  const Logo = TOKEN_LOGOS[symbol];
  return <Logo height={size} width={size} />;
}

function NetworkLogo({ chainId }: { chainId: number | null }) {
  const Logo = chainId === 1 || chainId === 11155111
    ? EthereumLogo
    : chainId === 42161 || chainId === 421614
      ? ArbitrumLogo
      : chainId === 101 || chainId === 103
        ? SolanaLogo
        : null;

  return (
    <View style={styles.networkLogoFrame}>
      {Logo ? <Logo height={25} width={25} /> : <CircleHelp color="#71717a" size={22} />}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 10
  },
  loadingRows: {
    gap: 8
  },
  rows: {
    gap: 0
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 60,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  networkLogoFrame: {
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  rowCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  amountCopy: {
    alignItems: 'flex-end',
    gap: 2
  }
});
