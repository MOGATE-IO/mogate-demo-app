import { HomeDashboard } from '@/features/home/components/HomeDashboard';
import { formatTokenAmount, formatUsdAmount } from '@/features/checkout/services/paymentBalances';
import { getAccountDisplayName } from '@/features/profile/utils/accountDisplay';
import type { AppScreenContext } from './types';

export function HomeScreen({ context }: { context: AppScreenContext }) {
  const { catalogue, paymentBalances, topUp, wallet } = context;
  const ownerAddress = wallet.snapshot.ownerAddress || wallet.snapshot.address || '';
  const accountName = getAccountDisplayName(wallet.snapshot);
  const giftcardsOwned = context.inventory.items.length;
  const giftcardValueDisplay = formatUsdAmount(context.inventory.totalValue);
  const usdcTotal = paymentBalances.portfolio.rows
    .filter((row) => row.symbol === 'USDC')
    .reduce((total, row) => total + row.amount, 0);
  const usdtTotal = paymentBalances.portfolio.rows
    .filter((row) => row.symbol === 'USDT')
    .reduce((total, row) => total + row.amount, 0);
  const targetEth = paymentBalances.targetNative?.amount ?? 0;

  return (
    <HomeDashboard
      accountName={accountName}
      assetTotals={[
        { symbol: 'USDC', value: formatTokenAmount(usdcTotal) },
        { symbol: 'USDT', value: formatTokenAmount(usdtTotal) },
        { symbol: 'ETH', value: formatTokenAmount(targetEth) }
      ]}
      balanceLoading={paymentBalances.status === 'loading'}
      balanceTotal={formatUsdAmount(paymentBalances.portfolio.totalUsd)}
      catalogueError={catalogue.lastError}
      catalogueItems={catalogue.items}
      catalogueLoading={catalogue.loading}
      giftcardValueDisplay={giftcardValueDisplay}
      giftcardsOwned={giftcardsOwned}
      environmentLabel={context.profile.mode === 'testnet' ? 'Testnet' : 'Mainnet'}
      loginMethod={wallet.snapshot.identity?.loginMethods?.[0]}
      networkLabel={context.profile.ua.chainLabel}
      onBrowse={() => context.goToTab('catalogue')}
      onCheckout={(merchant, amount) => context.goToCheckout({ merchant, amount })}
      onTopUp={topUp}
      ownerAddress={ownerAddress}
      trending={catalogue.trending}
      walletError={paymentBalances.errors[0] ?? wallet.snapshot.lastError}
    />
  );
}
