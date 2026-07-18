import { AccountDrawer } from '@/features/account/components/AccountDrawer.ui';
import { useAccountDrawer } from '@/features/account/hooks/useAccountDrawer';
import { CatalogueBrowser } from '@/features/catalogue/components/CatalogueBrowser.ui';
import { formatUsdAmount } from '@/features/checkout/services/paymentBalances';
import {
  getAccountAvatarLabel,
  getAccountDisplayName
} from '@/features/profile/utils/accountDisplay';
import type { AppScreenContext } from './types';

export function CatalogueScreen({ context }: { context: AppScreenContext }) {
  const drawer = useAccountDrawer({
    onAccountSection: context.goToAccountSection,
    onProfile: context.goToProfile
  });
  const accountName = getAccountDisplayName(context.wallet.snapshot);
  const ownerAddress = context.wallet.snapshot.ownerAddress || context.wallet.snapshot.address || '';

  return (
    <>
      <CatalogueBrowser
        accountName={accountName}
        avatarLabel={getAccountAvatarLabel(accountName)}
        canLoadMore={context.catalogue.canLoadMore}
        country={context.catalogue.country}
        lastError={context.catalogue.lastError}
        loading={context.catalogue.loading}
        providerLoading={context.catalogue.providerLoading}
        providerWarning={context.catalogue.providerWarning}
        merchants={context.catalogue.visible}
        onCountryChange={context.catalogue.setCountry}
        onLoadMore={context.catalogue.loadMore}
        onOpenAccount={drawer.open}
        onQueryChange={context.catalogue.setQuery}
        onRetry={context.catalogue.reload}
        onSelectMerchant={(merchant) => context.goToCheckout({
          merchant,
          amount: merchant.availableAmounts[0] ?? 0,
          region: merchant.country ?? merchant.regions[0] ?? 'GLOBAL'
        })}
        query={context.catalogue.query}
        totalCount={context.catalogue.totalFiltered}
      />
      <AccountDrawer
        accountName={accountName}
        avatarLabel={getAccountAvatarLabel(accountName)}
        balanceDisplay={formatUsdAmount(context.paymentBalances.portfolio.totalUsd)}
        giftcardCount={context.inventory.items.length}
        networkLabel={context.profile.ua.chainLabel}
        onClose={drawer.close}
        onOpenProfile={drawer.openProfile}
        onOpenSection={drawer.openSection}
        ownerAddress={ownerAddress}
        visible={drawer.visible}
      />
    </>
  );
}
