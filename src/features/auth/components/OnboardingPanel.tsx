import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/InfoRow';
import { StatusPill } from '@/components/StatusPill';
import type { WalletStatus, WalletStack } from '@/@web3/types/wallet';

export type OnboardingPanelProps = {
  walletStack: WalletStack;
  walletStatus: WalletStatus;
  walletReady: boolean;
  loading: boolean;
  connectLabel: string;
  networkLabel: string;
  chainId: number;
  topUpProvider: string;
  error?: string | null;
  onConnect: () => void;
};

export function OnboardingPanel({
  chainId,
  connectLabel,
  error,
  loading,
  networkLabel,
  onConnect,
  topUpProvider,
  walletReady,
  walletStack,
  walletStatus
}: OnboardingPanelProps) {
  return (
    <View style={styles.stack}>
      <Card
        title="Start with your Mogate wallet"
        eyebrow="Onboarding"
        right={<StatusPill status={walletStatus === 'error' ? 'error' : walletStatus} />}
      >
        <Text style={styles.copy}>
          Sign in once to create or restore the embedded wallet used for UA minting, top-up, inventory, and Commerce Code experiments.
        </Text>
        <Button disabled={!walletReady} loading={loading} onPress={onConnect} variant="primary">
          {connectLabel}
        </Button>
        <InfoRow label="Wallet stack" value={walletStack} />
        <InfoRow label="Network" value={`${networkLabel} (${chainId})`} />
        <InfoRow label="Top-up provider" value={topUpProvider} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14
  },
  copy: {
    color: '#4f4740',
    fontSize: 14,
    lineHeight: 20
  },
  error: {
    backgroundColor: '#fff0ee',
    borderColor: '#f1b5ad',
    borderRadius: 8,
    borderWidth: 1,
    color: '#a3372d',
    fontSize: 13,
    lineHeight: 18,
    padding: 10
  }
});
