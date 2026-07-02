import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/InfoRow';
import { SegmentOption, SegmentedControl } from '@/components/SegmentedControl';
import { StatusPill } from '@/components/StatusPill';
import type { AppNetworkMode } from '@/config/networkProfiles';
import { getProductReadinessChecks } from '@/config/productReadiness';
import { getSignerProviderInfo } from '@/config/signerProviders';
import { WALLET_STACK_OPTIONS } from '@/config/walletStack';
import type { WalletStack } from '@/types/wallet';
import { shortenAddress } from '@/utils/format';
import type { AppScreenContext } from './types';

const NETWORK_OPTIONS: SegmentOption<AppNetworkMode>[] = [
  { value: 'testnet', label: 'Testnet' },
  { value: 'mainnet', label: 'Mainnet' }
];

const STACK_OPTIONS: SegmentOption<WalletStack>[] = WALLET_STACK_OPTIONS.map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1)
}));

function listValue(values?: string[] | null) {
  return values?.length ? values.join(', ') : 'Not available';
}

function unixValue(value?: number | null) {
  if (!value) return 'Not available';
  return new Date(value * 1000).toISOString();
}

export function ProfileAboutScreen({ context }: { context: AppScreenContext }) {
  const providerInfo = getSignerProviderInfo(context.wallet.selectedStack);
  const productChecks = getProductReadinessChecks(context.wallet.selectedStack, context.profile);

  async function changeNetwork(mode: AppNetworkMode) {
    if (mode === context.networkMode) return;
    await context.wallet.disconnect();
    context.setNetworkMode(mode);
  }

  return (
    <View style={styles.stack}>
      <Button onPress={() => context.goToTab('profile')} variant="quiet">
        Back to wallet
      </Button>

      <Card title="Settings" eyebrow="Environment">
        <SegmentedControl value={context.networkMode} options={NETWORK_OPTIONS} onChange={changeNetwork} />
        <InfoRow label="Profile" value={context.profile.description} />
        <InfoRow label="Target chain" value={`${context.profile.ua.chainLabel} (${context.profile.ua.targetChainId})`} />
        <InfoRow label="Checkout endpoint" value={context.profile.checkoutEndpoint || 'Manual JSON'} mono />
      </Card>

      <Card title="Signer provider" eyebrow="EIP-7702 source" right={<StatusPill status={context.productSignerReady ? 'ready' : 'blocked'} />}>
        <SegmentedControl value={context.wallet.selectedStack} options={STACK_OPTIONS} onChange={context.wallet.switchStack} />
        <InfoRow label="Provider" value={providerInfo.label} />
        <InfoRow label="Status" value={providerInfo.readiness} />
        <InfoRow label="Authorization API" value={providerInfo.authorizationApi} />
        <InfoRow label="Owner EOA" value={shortenAddress(context.wallet.snapshot.ownerAddress || context.wallet.snapshot.address)} mono />
        <View style={styles.actions}>
          <Button onPress={context.wallet.refresh} disabled={context.wallet.snapshot.status !== 'connected'}>
            Refresh
          </Button>
          <Button onPress={context.wallet.disconnect} disabled={context.wallet.snapshot.status !== 'connected'} variant="quiet">
            Disconnect
          </Button>
        </View>
      </Card>

      <Card title="Product readiness" eyebrow="Ship gates">
        {productChecks.map((check) => (
          <View key={check.id} style={styles.gate}>
            <View style={styles.gateHeader}>
              <Text style={styles.gateTitle}>{check.label}</Text>
              <StatusPill status={check.status} />
            </View>
            <Text style={styles.gateDetail}>{check.detail}</Text>
          </View>
        ))}
      </Card>

      <Card title="User detail" eyebrow="Identity continuity">
        <InfoRow label="Provider user" value={context.wallet.snapshot.identity?.providerUserId} mono />
        <InfoRow label="User created" value={unixValue(context.wallet.snapshot.identity?.providerUserCreatedAt)} mono />
        <InfoRow label="Login methods" value={listValue(context.wallet.snapshot.identity?.loginMethods)} />
        <InfoRow label="OAuth emails" value={listValue(context.wallet.snapshot.identity?.oauthEmails)} />
        <InfoRow label="Embedded EVM wallets" value={listValue(context.wallet.snapshot.identity?.embeddedEvmWallets)} mono />
        <InfoRow label="Particle EVM UA" value={shortenAddress(context.wallet.snapshot.evmUaAddress)} mono />
        <InfoRow label="Particle Solana UA" value={shortenAddress(context.wallet.snapshot.solanaUaAddress)} mono />
        {context.wallet.snapshot.identity?.warnings.length ? (
          <View style={styles.warningBox}>
            {context.wallet.snapshot.identity.warnings.map((warning) => (
              <Text key={warning} style={styles.warningText}>
                {warning}
              </Text>
            ))}
          </View>
        ) : null}
      </Card>
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
  gate: {
    borderTopColor: '#eee8de',
    borderTopWidth: 1,
    gap: 7,
    paddingTop: 11
  },
  gateHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between'
  },
  gateTitle: {
    color: '#171512',
    flex: 1,
    fontSize: 14,
    fontWeight: '800'
  },
  gateDetail: {
    color: '#6f6860',
    fontSize: 13,
    lineHeight: 18
  },
  warningBox: {
    backgroundColor: '#fff8e9',
    borderColor: '#edd49a',
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 10
  },
  warningText: {
    color: '#7b5812',
    fontSize: 13,
    lineHeight: 18
  }
});
