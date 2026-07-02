import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/InfoRow';
import { StatusPill } from '@/components/StatusPill';
import type { AppScreenContext } from './types';

export function OnboardingScreen({ context }: { context: AppScreenContext }) {
  const preparingWallet = context.wallet.adapter?.isReady === false;
  const connectLabel = preparingWallet ? 'Preparing wallet' : 'Continue with Privy';

  return (
    <View style={styles.stack}>
      <Card
        title="Start with your Mogate wallet"
        eyebrow="Onboarding"
        right={<StatusPill status={context.wallet.snapshot.status === 'error' ? 'error' : context.wallet.snapshot.status} />}
      >
        <Text style={styles.copy}>
          Sign in once to create or restore the embedded wallet used for UA minting, top-up, inventory, and Commerce Code experiments.
        </Text>
        <Button
          disabled={!context.wallet.isAdapterReady}
          loading={context.wallet.snapshot.status === 'connecting'}
          onPress={context.wallet.connect}
          variant="primary"
        >
          {connectLabel}
        </Button>
        <InfoRow label="Wallet stack" value={context.wallet.selectedStack} />
        <InfoRow label="Network" value={`${context.profile.ua.chainLabel} (${context.profile.ua.targetChainId})`} />
        <InfoRow label="Top-up provider" value={context.profile.onramp.primaryProvider} />
        {context.wallet.snapshot.lastError ? (
          <Text style={styles.error}>{context.wallet.snapshot.lastError}</Text>
        ) : null}
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
