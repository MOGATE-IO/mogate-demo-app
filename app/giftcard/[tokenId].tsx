import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { AppRouteFrame } from '@/components/AppRouteFrame.ui';
import { RouteState } from '@/components/RouteState.ui';
import { useMobileApp } from '@/providers/MobileAppProvider';
import { GiftcardDetailScreen } from '@/screens/GiftcardDetailScreen';

export default function GiftcardDetailRoute() {
  const context = useMobileApp();
  const router = useRouter();
  const params = useLocalSearchParams<{ tokenId?: string | string[] }>();
  const tokenId = Array.isArray(params.tokenId) ? params.tokenId[0] : params.tokenId;
  const item = context.inventory.items.find((candidate) => candidate.tokenId === tokenId);

  if (context.wallet.snapshot.status !== 'connected') {
    return <Redirect href="/onboarding" />;
  }

  if (!item) {
    return (
      <AppRouteFrame scroll={false}>
        <RouteState
          actionLabel={context.inventory.status === 'loading' ? undefined : 'Back to inventory'}
          body={context.inventory.status === 'loading'
            ? 'Loading the giftcard from your connected wallet.'
            : 'This giftcard is not available in the connected wallet.'}
          loading={context.inventory.status === 'loading'}
          onAction={context.inventory.status === 'loading' ? undefined : () => context.goToTab('inventory')}
          title={context.inventory.status === 'loading' ? 'Loading giftcard' : 'Giftcard not found'}
        />
      </AppRouteFrame>
    );
  }

  return (
    <AppRouteFrame scroll={false}>
      <GiftcardDetailScreen context={context} item={item} onBack={() => router.back()} />
    </AppRouteFrame>
  );
}
