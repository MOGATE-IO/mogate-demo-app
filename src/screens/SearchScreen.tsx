import { CatalogueBrowser } from '@/features/catalogue/components/CatalogueBrowser';
import { useCatalogueSelection } from '@/features/catalogue/hooks/useCatalogueSelection';
import type { AppScreenContext } from './types';

export function SearchScreen({ context }: { context: AppScreenContext }) {
  const selection = useCatalogueSelection();

  return (
    <CatalogueBrowser
      lastError={context.catalogue.lastError}
      loading={context.catalogue.loading}
      merchants={context.catalogue.filtered}
      onBack={selection.clearSelection}
      onCheckout={(merchant, amount) => context.goToCheckout({ merchant, amount })}
      onQueryChange={context.catalogue.setQuery}
      onSelectAmount={selection.setAmount}
      onSelectMerchant={selection.selectMerchant}
      query={context.catalogue.query}
      selected={selection.selected}
      selectedAmount={selection.selectedAmount}
    />
  );
}
