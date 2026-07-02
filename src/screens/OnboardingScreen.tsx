import { OnboardingPanel } from '@/features/auth/components/OnboardingPanel';
import type { AppScreenContext } from './types';

export function OnboardingScreen({ context }: { context: AppScreenContext }) {
  const preparingWallet = context.wallet.adapter?.isReady === false;
  const connectLabel = preparingWallet ? 'Preparing wallet' : 'Continue with Privy';

  return (
    <OnboardingPanel
      chainId={context.profile.ua.targetChainId}
      connectLabel={connectLabel}
      error={context.wallet.snapshot.lastError}
      loading={context.wallet.snapshot.status === 'connecting'}
      networkLabel={context.profile.ua.chainLabel}
      onConnect={context.wallet.connect}
      topUpProvider={context.profile.onramp.primaryProvider}
      walletReady={context.wallet.isAdapterReady}
      walletStack={context.wallet.selectedStack}
      walletStatus={context.wallet.snapshot.status}
    />
  );
}
