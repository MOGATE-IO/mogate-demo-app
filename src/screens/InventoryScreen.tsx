import { LoginRequired } from '@/components/LoginRequired';
import { GiftcardInventoryView } from '@/features/inventory/components/GiftcardInventoryView.ui';
import type { AppScreenContext } from './types';

export function InventoryScreen({ context }: { context: AppScreenContext }) {
  const connected = context.wallet.snapshot.status === 'connected';
  const preparingWallet = context.wallet.adapter?.isReady === false;

  if (!connected) {
    return (
      <LoginRequired
        buttonLabel={preparingWallet ? 'Preparing' : 'Connect'}
        disabled={!context.wallet.isAdapterReady}
        loading={context.wallet.snapshot.status === 'connecting'}
        onLogin={context.wallet.connect}
        detail="Connect to view giftcards owned by your wallet."
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <GiftcardInventoryView
        inventory={context.inventory}
        onBrowse={() => context.goToTab('search')}
        profile={context.profile}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 96
  }
});
import { ScrollView, StyleSheet } from 'react-native';
