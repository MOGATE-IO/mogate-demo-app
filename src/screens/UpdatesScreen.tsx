import { UpdatesHub } from '@/features/updates/components/UpdatesHub.ui';
import { MOCK_MOGATE_NEWS } from '@/features/updates/services/mockUpdates';
import type { AppScreenContext } from './types';

export function UpdatesScreen({ context }: { context: AppScreenContext }) {
  const result = context.mint.mintResult;
  const recentTransactionLabel = result
    ? `Giftcard ${result.tokenId ? `#${result.tokenId}` : ''} minted on ${context.profile.ua.chainLabel}.`
    : null;

  return (
    <UpdatesHub
      featured={context.catalogue.trending[0] ?? null}
      news={MOCK_MOGATE_NEWS}
      onBrowsePromotion={() => context.goToTab('catalogue')}
      recentTransactionLabel={recentTransactionLabel}
    />
  );
}
