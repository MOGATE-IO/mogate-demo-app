import { useMemo, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/InfoRow';
import { StatusPill } from '@/components/StatusPill';
import { useWalletPortfolio } from '@/hooks/useWalletPortfolio';
import {
  getPortfolioNetworkLabel,
  type NetworkBalance,
  type PortfolioNetworkKey
} from '@/services/walletPortfolio';
import { formatUsd, shortenAddress } from '@/utils/format';
import type { AppScreenContext } from './types';

const SECONDARY_NETWORKS: PortfolioNetworkKey[] = ['ethereum', 'base', 'solana'];

type AccordionState = Record<PortfolioNetworkKey, boolean>;

const initialAccordionState: AccordionState = {
  arbitrum: true,
  ethereum: false,
  base: false,
  solana: false
};

function statusFromTopUp(status: AppScreenContext['topUpStatus']['status']) {
  if (status === 'error') return 'error';
  if (status === 'success') return 'done';
  if (status === 'opening') return 'idle';
  return 'idle';
}

export function ProfileScreen({ context }: { context: AppScreenContext }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<AccordionState>(initialAccordionState);
  const ownerAddress = context.wallet.snapshot.ownerAddress || context.wallet.snapshot.address || '';
  const solanaAddress =
    context.wallet.snapshot.linkedSolanaAddress || context.wallet.snapshot.solanaUaAddress || '';
  const portfolio = useWalletPortfolio({
    evmAddress: ownerAddress,
    solanaAddress
  });

  const stablecoinTotal = useMemo(
    () => formatUsd(portfolio.loadedTotalUsd),
    [portfolio.loadedTotalUsd]
  );
  const uaBalance = context.balance.balance ? context.balance.formattedTotal : 'Not loaded';

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

  return (
    <View style={styles.stack}>
      <Card
        title="Mainnet wallet"
        eyebrow="Profile"
        right={<StatusPill status={context.wallet.snapshot.status === 'connected' ? 'ready' : context.wallet.snapshot.status} />}
      >
        <View style={styles.actions}>
          <Button onPress={context.wallet.refresh}>
            Refresh
          </Button>
          <Button onPress={context.goToProfileAbout} variant="quiet">
            About
          </Button>
        </View>

        <AddressBlock
          label="Owner EOA"
          address={ownerAddress}
          copied={copied === 'Owner EOA'}
          onCopy={() => copyAddress('Owner EOA', ownerAddress)}
        />
        <AddressBlock
          label="Solana wallet"
          address={solanaAddress}
          copied={copied === 'Solana wallet'}
          emptyValue="No linked Solana wallet"
          onCopy={() => copyAddress('Solana wallet', solanaAddress)}
        />
      </Card>

      <Card title="Wallet balance" eyebrow={context.profile.ua.chainLabel}>
        <View style={styles.balanceGrid}>
          <View style={styles.balanceTile}>
            <Text style={styles.balanceLabel}>Unified UA</Text>
            <Text style={styles.balanceValue}>{uaBalance}</Text>
            <Text style={styles.balanceHint}>Particle/UA reported balance</Text>
          </View>
          <View style={styles.balanceTile}>
            <Text style={styles.balanceLabel}>Loaded stablecoins</Text>
            <Text style={styles.balanceValue}>{stablecoinTotal}</Text>
            <Text style={styles.balanceHint}>USDC + USDT from loaded chains</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button onPress={context.topUp} disabled={!ownerAddress} loading={context.topUpStatus.status === 'opening'} variant="primary">
            Top up USDC
          </Button>
          <Button onPress={portfolio.refreshArbitrum} disabled={!ownerAddress || portfolio.networks.arbitrum.status === 'loading'}>
            Refresh Arbitrum
          </Button>
        </View>

        {context.topUpStatus.message ? (
          <View style={[styles.notice, context.topUpStatus.status === 'error' && styles.noticeError]}>
            <View style={styles.noticeHeader}>
              <Text style={[styles.noticeTitle, context.topUpStatus.status === 'error' && styles.noticeTitleError]}>
                {context.topUpStatus.status === 'error' ? 'Top-up blocked' : 'Top-up'}
              </Text>
              <StatusPill status={statusFromTopUp(context.topUpStatus.status)} />
            </View>
            <Text style={styles.noticeText}>{context.topUpStatus.message}</Text>
          </View>
        ) : null}

        <NetworkBalancePanel
          balance={portfolio.networks.arbitrum.data}
          error={portfolio.networks.arbitrum.error}
          label="Arbitrum One"
          loading={portfolio.networks.arbitrum.status === 'loading'}
          onLoad={portfolio.refreshArbitrum}
          primary
          status={portfolio.networks.arbitrum.status}
        />
      </Card>

      <Card title="Other networks" eyebrow="Load on demand">
        {SECONDARY_NETWORKS.map((network) => {
          const state = portfolio.networks[network];
          const open = expanded[network];
          return (
            <View key={network} style={styles.accordionItem}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() => toggleNetwork(network)}
                style={({ pressed }) => [styles.accordionHeader, pressed && styles.pressed]}
              >
                <View style={styles.accordionHeaderText}>
                  <Text style={styles.networkLabel}>{getPortfolioNetworkLabel(network)}</Text>
                  <Text style={styles.networkHint}>
                    {network === 'solana'
                      ? solanaAddress
                        ? shortenAddress(solanaAddress)
                        : 'Needs linked Solana wallet'
                      : ownerAddress
                        ? shortenAddress(ownerAddress)
                        : 'Connect EOA first'}
                  </Text>
                </View>
                <Text style={styles.chevron}>{open ? '-' : '+'}</Text>
              </Pressable>

              {open ? (
                <NetworkBalancePanel
                  balance={state.data}
                  error={state.error}
                  label={getPortfolioNetworkLabel(network)}
                  loading={state.status === 'loading'}
                  onLoad={() => portfolio.load(network)}
                  status={state.status}
                />
              ) : null}
            </View>
          );
        })}
      </Card>
    </View>
  );
}

function AddressBlock({
  address,
  copied,
  emptyValue = 'Not connected',
  label,
  onCopy
}: {
  address?: string | null;
  copied: boolean;
  emptyValue?: string;
  label: string;
  onCopy: () => void;
}) {
  return (
    <View style={styles.addressBlock}>
      <View style={styles.addressHeader}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Button disabled={!address} onPress={onCopy} variant="quiet">
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </View>
      <Text selectable style={styles.addressValue}>
        {address || emptyValue}
      </Text>
    </View>
  );
}

function NetworkBalancePanel({
  balance,
  error,
  label,
  loading,
  onLoad,
  primary,
  status
}: {
  balance: NetworkBalance | null;
  error: string | null;
  label: string;
  loading: boolean;
  onLoad: () => void;
  primary?: boolean;
  status: 'idle' | 'loading' | 'ready' | 'error';
}) {
  return (
    <View style={[styles.networkPanel, primary && styles.networkPanelPrimary]}>
      <View style={styles.networkPanelHeader}>
        <View>
          <Text style={styles.networkTitle}>{label}</Text>
          <Text style={styles.networkSubtitle}>USDC / USDT</Text>
        </View>
        <Button loading={loading} onPress={onLoad} variant={status === 'error' ? 'danger' : 'quiet'}>
          {status === 'ready' ? 'Reload' : 'Load'}
        </Button>
      </View>

      {status === 'idle' ? (
        <Text style={styles.emptyText}>Load this network to read token balances.</Text>
      ) : null}
      {status === 'loading' ? (
        <View style={styles.skeletonStack}>
          <View style={styles.skeleton} />
          <View style={styles.skeleton} />
        </View>
      ) : null}
      {status === 'error' && error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}
      {balance ? (
        <View style={styles.tokenRows}>
          {balance.tokens.map((token) => (
            <View key={token.symbol} style={styles.tokenRow}>
              <Text style={styles.tokenSymbol}>{token.symbol}</Text>
              <View style={styles.tokenAmount}>
                <Text style={styles.tokenValue}>
                  {token.amountDisplay} {token.symbol}
                </Text>
                <Text style={styles.tokenUsd}>{formatUsd(token.usdValue)}</Text>
              </View>
            </View>
          ))}
          <InfoRow label="Network total" value={formatUsd(balance.totalUsd)} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  addressBlock: {
    borderTopColor: '#eee8de',
    borderTopWidth: 1,
    gap: 8,
    paddingTop: 10
  },
  addressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between'
  },
  rowLabel: {
    color: '#7d746a',
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase'
  },
  addressValue: {
    backgroundColor: '#fbfaf7',
    borderColor: '#e3ddd3',
    borderRadius: 8,
    borderWidth: 1,
    color: '#171512',
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 18,
    padding: 10
  },
  balanceGrid: {
    flexDirection: 'row',
    gap: 10
  },
  balanceTile: {
    backgroundColor: '#fbfaf7',
    borderColor: '#e3ddd3',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minHeight: 96,
    padding: 12
  },
  balanceLabel: {
    color: '#7d746a',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  balanceValue: {
    color: '#171512',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0
  },
  balanceHint: {
    color: '#6f6860',
    fontSize: 11,
    lineHeight: 15
  },
  notice: {
    backgroundColor: '#f7fbf6',
    borderColor: '#cfe9dc',
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    padding: 10
  },
  noticeError: {
    backgroundColor: '#fff0ee',
    borderColor: '#f1b5ad'
  },
  noticeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  noticeTitle: {
    color: '#106b4f',
    flex: 1,
    fontSize: 13,
    fontWeight: '900'
  },
  noticeTitleError: {
    color: '#a3372d'
  },
  noticeText: {
    color: '#4f4740',
    fontSize: 12,
    lineHeight: 17
  },
  networkPanel: {
    backgroundColor: '#fbfaf7',
    borderColor: '#e3ddd3',
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  networkPanelPrimary: {
    backgroundColor: '#ffffff'
  },
  networkPanelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between'
  },
  networkTitle: {
    color: '#171512',
    fontSize: 14,
    fontWeight: '900'
  },
  networkSubtitle: {
    color: '#6f6860',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2
  },
  emptyText: {
    color: '#6f6860',
    fontSize: 12,
    lineHeight: 17
  },
  skeletonStack: {
    gap: 8
  },
  skeleton: {
    backgroundColor: '#eee8de',
    borderRadius: 8,
    height: 42
  },
  errorText: {
    backgroundColor: '#fff0ee',
    borderColor: '#f1b5ad',
    borderRadius: 8,
    borderWidth: 1,
    color: '#a3372d',
    fontSize: 12,
    lineHeight: 17,
    padding: 10
  },
  tokenRows: {
    gap: 8
  },
  tokenRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#eee8de',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  tokenSymbol: {
    color: '#171512',
    fontSize: 13,
    fontWeight: '900'
  },
  tokenAmount: {
    alignItems: 'flex-end',
    flex: 1,
    gap: 2
  },
  tokenValue: {
    color: '#171512',
    fontFamily: 'Courier',
    fontSize: 12
  },
  tokenUsd: {
    color: '#6f6860',
    fontSize: 11
  },
  accordionItem: {
    borderTopColor: '#eee8de',
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 10
  },
  accordionHeader: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 6,
    paddingVertical: 4
  },
  pressed: {
    opacity: 0.75
  },
  accordionHeaderText: {
    flex: 1
  },
  networkLabel: {
    color: '#171512',
    fontSize: 14,
    fontWeight: '900'
  },
  networkHint: {
    color: '#6f6860',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2
  },
  chevron: {
    color: '#171512',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    width: 28
  }
});
