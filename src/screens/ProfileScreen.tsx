import { WalletProfileView } from '@/features/profile/components/WalletProfileView';
import { useWalletProfile } from '@/features/profile/hooks/useWalletProfile';
import type { AppScreenContext } from './types';

export function ProfileScreen({ context }: { context: AppScreenContext }) {
  const ownerAddress = context.wallet.snapshot.ownerAddress || context.wallet.snapshot.address || '';
  const profileState = useWalletProfile({
    ownerAddress,
    linkedSolanaAddress: context.wallet.snapshot.linkedSolanaAddress,
    solanaUaAddress: context.wallet.snapshot.solanaUaAddress,
    uaBalanceDisplay: context.balance.balance ? context.balance.formattedTotal : 'Not loaded'
  });

  return (
    <WalletProfileView
      chainLabel={context.profile.ua.chainLabel}
      onAbout={context.goToProfileAbout}
      onRefresh={context.wallet.refresh}
      onTopUp={context.topUp}
      profileState={profileState}
      topUpStatus={context.topUpStatus}
      walletStatus={context.wallet.snapshot.status}
    />
  );
}
