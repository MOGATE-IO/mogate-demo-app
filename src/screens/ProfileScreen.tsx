import { WalletProfileView } from '@/features/profile/components/WalletProfileView';
import { useWalletProfile } from '@/features/profile/hooks/useWalletProfile';
import { getAccountDisplayName } from '@/features/profile/utils/accountDisplay';
import { formatUsdAmount } from '@/features/checkout/services/paymentBalances';
import { TransferMoneySheet } from '@/features/transfer/components/TransferMoneySheet.ui';
import { useUniversalAccountTransfer } from '@/features/transfer/hooks/useUniversalAccountTransfer';
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
  const transfer = useUniversalAccountTransfer({
    wallet: context.wallet.snapshot,
    adapter: context.wallet.adapter,
    profile: context.profile,
    portfolio: context.paymentBalances.portfolio,
    nativeRows: context.paymentBalances.nativeRows,
    particleAssets: context.balance.assets,
    onRefreshBalances: context.paymentBalances.refresh,
    onRefreshWallet: context.wallet.refresh
  });

  return (
    <>
      <WalletProfileView
        accountName={accountName}
        balanceErrors={context.paymentBalances.errors}
        balanceStatus={context.paymentBalances.status}
        giftcardCount={context.inventory.items.length}
        giftcardValue={formatUsdAmount(context.inventory.totalValue)}
        loginMethod={context.wallet.snapshot.identity?.loginMethods[0]}
        networkLabel={context.profile.ua.chainLabel}
        onBack={() => context.goToTab('catalogue')}
        onLogout={context.wallet.disconnect}
        onRefreshBalances={context.paymentBalances.refresh}
        onSettings={() => context.goToAccountSection('account-settings')}
        onTransfer={transfer.open}
        onTopUp={context.topUp}
        portfolio={context.paymentBalances.portfolio}
        nativeRows={context.paymentBalances.nativeRows}
        profileState={profileState}
        stablecoinBalance={formatUsdAmount(context.paymentBalances.portfolio.totalUsd)}
        showTestnetNative={context.profile.mode === 'testnet'}
      />
      <TransferMoneySheet transfer={transfer} />
    </>
  );
}
