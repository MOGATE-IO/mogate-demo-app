import { MintCheckoutView } from '@/features/checkout/components/MintCheckoutView';
import type { AppScreenContext } from './types';

export function MintCheckoutScreen({ context }: { context: AppScreenContext }) {
  const { mint, wallet } = context;
  const ownerAddress = wallet.snapshot.ownerAddress || wallet.snapshot.address || '';
  const checkoutOwnerMatch = mint.preparedCheckout
    ? mint.preparedCheckout.to.toLowerCase() === ownerAddress.toLowerCase()
    : false;
  const canMint =
    wallet.snapshot.status === 'connected' &&
    context.productSignerReady &&
    checkoutOwnerMatch &&
    Boolean(mint.preparedCheckout);

  return (
    <MintCheckoutView
      canMint={canMint}
      checkoutSelection={context.checkoutSelection}
      mint={mint}
      onBack={() => context.goToTab('search')}
      ownerAddress={ownerAddress}
      profile={context.profile}
    />
  );
}
