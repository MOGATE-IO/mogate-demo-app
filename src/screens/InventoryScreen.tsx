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
    <GiftcardInventoryView
      inventory={context.inventory}
      onBrowse={() => context.goToTab('catalogue')}
      onOpenDetails={(item) => context.goToGiftcardDetails(item.tokenId)}
      profile={context.profile}
    />
  );
}
