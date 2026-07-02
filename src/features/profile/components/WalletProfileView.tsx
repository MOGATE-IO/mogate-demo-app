import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/InfoRow';
import { StatusPill } from '@/components/StatusPill';
import {
  getPortfolioNetworkLabel,
  type NetworkBalance,
  type PortfolioNetworkKey
} from '@/features/profile/services/walletPortfolio';
import type { WalletProfileState } from '@/features/profile/hooks/useWalletProfile';
import type { WalletStatus } from '@/@web3/types/wallet';
import { formatUsd, shortenAddress } from '@/utils/format';

const SECONDARY_NETWORKS: PortfolioNetworkKey[] = ['ethereum', 'base', 'solana'];

type TopUpStatus = {
  status: 'idle' | 'opening' | 'success' | 'error';
  message: string | null;
};

export type WalletProfileViewProps = {
  walletStatus: WalletStatus;
  profileState: WalletProfileState;
  topUpStatus: TopUpStatus;
  chainLabel: string;
  onRefresh: () => void;
  onAbout: () => void;
  onTopUp: () => void;
};

function statusFromTopUp(status: TopUpStatus['status']) {
  if (status === 'error') return 'error';
  if (status === 'success') return 'done';
  if (status === 'opening') return 'idle';
  return 'idle';
}

export function WalletProfileView({
  chainLabel,
  onAbout,
  onRefresh,
  onTopUp,
  profileState,
  topUpStatus,
  walletStatus
}: WalletProfileViewProps) {
  return (
    <View style={styles.stack}>
      <Card
        title="Mainnet wallet"
        eyebrow="Profile"
        right={<StatusPill status={walletStatus === 'connected' ? 'ready' : walletStatus} />}
      >
        <View style={styles.actions}>
          <Button onPress={onRefresh}>
            Refresh
          </Button>
          <Button onPress={onAbout} variant="quiet">
            About
          </Button>
        </View>

        <AddressBlock
          label="Owner EOA"
          address={profileState.ownerAddress}
          copied={profileState.copied === 'Owner EOA'}
          onCopy={() => profileState.copyAddress('Owner EOA', profileState.ownerAddress)}
        />
        <AddressBlock
          label="Solana wallet"
          address={profileState.solanaAddress}
          copied={profileState.copied === 'Solana wallet'}
          emptyValue="No Solana embedded wallet found"
          onCopy={() => profileState.copyAddress('Solana wallet', profileState.solanaAddress)}
        />
      </Card>

      <Card title="Wallet balance" eyebrow={chainLabel}>
        <View style={styles.balanceGrid}>
          <View style={styles.balanceTile}>
            <Text style={styles.balanceLabel}>Unified UA</Text>
            <Text style={styles.balanceValue}>{profileState.uaBalanceDisplay}</Text>
            <Text style={styles.balanceHint}>Particle/UA reported balance</Text>
          </View>
          <View style={styles.balanceTile}>
            <Text style={styles.balanceLabel}>Loaded stablecoins</Text>
            <Text style={styles.balanceValue}>{profileState.stablecoinTotal}</Text>
            <Text style={styles.balanceHint}>USDC + USDT from loaded chains</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button onPress={onTopUp} disabled={!profileState.ownerAddress} loading={topUpStatus.status === 'opening'} variant="primary">
            Top up USDC
          </Button>
          <Button
            onPress={profileState.portfolio.refreshArbitrum}
            disabled={!profileState.ownerAddress || profileState.portfolio.networks.arbitrum.status === 'loading'}
          >
            Refresh Arbitrum
          </Button>
        </View>

        {topUpStatus.message ? (
          <View style={[styles.notice, topUpStatus.status === 'error' && styles.noticeError]}>
            <View style={styles.noticeHeader}>
              <Text style={[styles.noticeTitle, topUpStatus.status === 'error' && styles.noticeTitleError]}>
                {topUpStatus.status === 'error' ? 'Top-up blocked' : 'Top-up'}
              </Text>
              <StatusPill status={statusFromTopUp(topUpStatus.status)} />
            </View>
            <Text style={styles.noticeText}>{topUpStatus.message}</Text>
          </View>
        ) : null}

        <NetworkBalancePanel
          balance={profileState.portfolio.networks.arbitrum.data}
          error={profileState.portfolio.networks.arbitrum.error}
          label="Arbitrum One"
          loading={profileState.portfolio.networks.arbitrum.status === 'loading'}
          onLoad={profileState.portfolio.refreshArbitrum}
          primary
          status={profileState.portfolio.networks.arbitrum.status}
        />
      </Card>

      <Card title="Other networks" eyebrow="Load on demand">
        {SECONDARY_NETWORKS.map((network) => {
          const state = profileState.portfolio.networks[network];
          const open = profileState.expanded[network];
          return (
            <View key={network} style={styles.accordionItem}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() => profileState.toggleNetwork(network)}
                style={({ pressed }) => [styles.accordionHeader, pressed && styles.pressed]}
              >
                <View style={styles.accordionHeaderText}>
                  <Text style={styles.networkLabel}>{getPortfolioNetworkLabel(network)}</Text>
                  <Text style={styles.networkHint}>
                    {network === 'solana'
                      ? profileState.solanaAddress
                        ? shortenAddress(profileState.solanaAddress)
                        : 'Connect a Privy Solana embedded wallet'
                      : profileState.ownerAddress
                        ? shortenAddress(profileState.ownerAddress)
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
                  onLoad={() => profileState.portfolio.load(network)}
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
    borderRadius: 8,
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
    letterSpacing: 0,
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
    backgroundColor: '#f7fbf7',
    borderColor: '#b9dfc0',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 10
  },
  noticeError: {
    backgroundColor: '#fff0ee',
    borderColor: '#f1b5ad'
  },
  noticeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  noticeTitle: {
    color: '#1e5e31',
    fontSize: 13,
    fontWeight: '900'
  },
  noticeTitleError: {
    color: '#a3372d'
  },
  noticeText: {
    color: '#4f4740',
    fontSize: 13,
    lineHeight: 18
  },
  networkPanel: {
    borderTopColor: '#eee8de',
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 12
  },
  networkPanelPrimary: {
    borderTopWidth: 0,
    paddingTop: 0
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
    marginTop: 2
  },
  tokenRows: {
    gap: 8
  },
  tokenRow: {
    alignItems: 'center',
    backgroundColor: '#fbfaf7',
    borderColor: '#e3ddd3',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10
  },
  tokenSymbol: {
    color: '#171512',
    fontSize: 14,
    fontWeight: '900'
  },
  tokenAmount: {
    alignItems: 'flex-end',
    gap: 2
  },
  tokenValue: {
    color: '#171512',
    fontSize: 14,
    fontWeight: '800'
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
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 44
  },
  accordionHeaderText: {
    flex: 1,
    gap: 2
  },
  networkLabel: {
    color: '#171512',
    fontSize: 14,
    fontWeight: '900'
  },
  networkHint: {
    color: '#6f6860',
    fontSize: 12
  },
  chevron: {
    color: '#171512',
    fontSize: 20,
    fontWeight: '900',
    width: 24,
    textAlign: 'center'
  },
  pressed: {
    opacity: 0.72
  },
  emptyText: {
    color: '#6f6860',
    fontSize: 13,
    lineHeight: 18
  },
  errorText: {
    backgroundColor: '#fff0ee',
    borderColor: '#f1b5ad',
    borderRadius: 8,
    borderWidth: 1,
    color: '#a3372d',
    fontSize: 13,
    lineHeight: 18,
    padding: 10
  },
  skeletonStack: {
    gap: 8
  },
  skeleton: {
    backgroundColor: '#eee8de',
    borderRadius: 8,
    height: 42
  }
});
