import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/InfoRow';
import { LoginRequired } from '@/components/LoginRequired';
import { shortenAddress } from '@/utils/format';
import type { AppScreenContext } from './types';

export function InventoryScreen({ context }: { context: AppScreenContext }) {
  const connected = context.wallet.snapshot.status === 'connected';
  const ownerAddress = context.wallet.snapshot.ownerAddress || context.wallet.snapshot.address || '';
  const preparingWallet = context.wallet.adapter?.isReady === false;

  if (!connected) {
    return (
      <LoginRequired
        buttonLabel={preparingWallet ? 'Preparing' : 'Connect'}
        disabled={!context.wallet.isAdapterReady}
        loading={context.wallet.snapshot.status === 'connecting'}
        onLogin={context.wallet.connect}
        detail="Connect to view funded giftcards and token actions."
      />
    );
  }

  return (
    <View style={styles.stack}>
      <Card title="Inventory" eyebrow={shortenAddress(ownerAddress)}>
        <InfoRow label="Owner" value={shortenAddress(ownerAddress)} mono />
        <InfoRow label="Settlement chain" value={context.profile.ua.chainLabel} />
        <InfoRow label="UA execution" value="EOA in-place" />
      </Card>

      {context.mint.mintResult ? (
        <Card title="Latest minted giftcard" eyebrow="Funded NFT">
          <InfoRow label="Token ID" value={context.mint.mintResult.tokenId || 'Waiting for receipt logs'} />
          <InfoRow label="Collection" value={shortenAddress(context.mint.preparedCheckout?.collection)} mono />
          <InfoRow label="Owner" value={shortenAddress(context.mint.preparedCheckout?.to)} mono />
          <View style={styles.actions}>
            <Button disabled>Send</Button>
            <Button disabled>Burn</Button>
            <Button disabled>Unwrap</Button>
          </View>
          <Text style={styles.helper}>
            These actions can be executed by the same owner EOA when the NFT is minted in-place.
          </Text>
        </Card>
      ) : (
        <Card title="No mobile mints yet" eyebrow="Ready">
          <Text style={styles.helper}>
            Purchased giftcards will appear here after checkout reconciliation returns the token ID.
          </Text>
          <Button onPress={() => context.goToTab('search')} variant="primary">
            Browse catalogue
          </Button>
        </Card>
      )}
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
  helper: {
    color: '#6f6860',
    fontSize: 13,
    lineHeight: 18
  }
});
