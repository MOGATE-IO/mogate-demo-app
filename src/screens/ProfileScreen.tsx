import { WalletProfileView } from '@/features/profile/components/WalletProfileView';
import { useWalletProfile } from '@/features/profile/hooks/useWalletProfile';
import { getAccountDisplayName } from '@/features/profile/utils/accountDisplay';
import { formatUsdAmount } from '@/features/checkout/services/paymentBalances';
import type { AppScreenContext } from './types';

export function ProfileScreen({ context }: { context: AppScreenContext }) {
  const ownerAddress = context.wallet.snapshot.ownerAddress || context.wallet.snapshot.address || '';
  const profileState = useWalletProfile({
    ownerAddress,
    linkedSolanaAddress: context.wallet.snapshot.linkedSolanaAddress,
    identityWarnings: context.wallet.snapshot.identity?.warnings,
    solanaUaAddress: context.wallet.snapshot.solanaUaAddress,
    uaBalanceDisplay: context.balance.balance ? context.balance.formattedTotal : 'Not loaded'
  });
  const accountName = getAccountDisplayName(context.wallet.snapshot);

  return (
    <WalletProfileView
      accountName={accountName}
      environmentLabel={context.profile.label}
      giftcardCount={context.inventory.items.length}
      giftcardValue={formatUsdAmount(context.inventory.totalValue)}
      loginMethod={context.wallet.snapshot.identity?.loginMethods[0]}
      networkLabel={context.profile.ua.chainLabel}
      onLogout={context.wallet.disconnect}
      onSettings={context.goToProfileAbout}
      profileState={profileState}
      stablecoinBalance={formatUsdAmount(context.paymentBalances.portfolio.totalUsd)}
    />
  );
}
