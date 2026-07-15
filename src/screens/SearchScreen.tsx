import { CatalogueBrowser } from '@/features/catalogue/components/CatalogueBrowser';
import { useCatalogueSelection } from '@/features/catalogue/hooks/useCatalogueSelection';
import type { AppScreenContext } from './types';

export function SearchScreen({ context }: { context: AppScreenContext }) {
  const selection = useCatalogueSelection();

  return (
    <CatalogueBrowser
      country={context.catalogue.country}
      lastError={context.catalogue.lastError}
      loading={context.catalogue.loading}
      canLoadMore={context.catalogue.canLoadMore}
      merchants={context.catalogue.visible}
      onBack={selection.clearSelection}
      onCheckout={(merchant, amount, region) => context.goToCheckout({ merchant, amount, region })}
      onCountryChange={context.catalogue.setCountry}
      onLoadMore={context.catalogue.loadMore}
      onQueryChange={context.catalogue.setQuery}
      onRetry={context.catalogue.reload}
      onSelectAmount={selection.setAmount}
      onSelectMerchant={selection.selectMerchant}
      onSelectRegion={selection.setRegion}
      query={context.catalogue.query}
      receiverAddress={context.wallet.snapshot.ownerAddress || context.wallet.snapshot.address}
      selected={selection.selected}
      selectedAmount={selection.selectedAmount}
      selectedRegion={selection.region}
      totalCount={context.catalogue.totalFiltered}
    />
  );
}
