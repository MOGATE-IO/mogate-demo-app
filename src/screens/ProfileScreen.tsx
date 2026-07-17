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
      balanceErrors={context.paymentBalances.errors}
      balanceStatus={context.paymentBalances.status}
      environmentLabel={context.profile.label}
      giftcardCount={context.inventory.items.length}
      giftcardValue={formatUsdAmount(context.inventory.totalValue)}
      loginMethod={context.wallet.snapshot.identity?.loginMethods[0]}
      networkLabel={context.profile.ua.chainLabel}
      onBack={() => context.goToTab('catalogue')}
      onLogout={context.wallet.disconnect}
      onRefreshBalances={context.paymentBalances.refresh}
      onSettings={() => context.goToAccountSection('account-settings')}
      onTopUp={context.topUp}
      portfolio={context.paymentBalances.portfolio}
      nativeRows={context.paymentBalances.nativeRows}
      profileState={profileState}
      stablecoinBalance={formatUsdAmount(context.paymentBalances.portfolio.totalUsd)}
      showTestnetNative={context.profile.mode === 'testnet'}
    />
  );
}
