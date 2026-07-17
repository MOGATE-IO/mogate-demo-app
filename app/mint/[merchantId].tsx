import { Redirect, useLocalSearchParams } from 'expo-router';

import { AppRouteFrame } from '@/components/AppRouteFrame.ui';
import { RouteState } from '@/components/RouteState.ui';
import { useCheckoutRoute } from '@/features/checkout/hooks/useCheckoutRoute';
import { useMobileApp } from '@/providers/MobileAppProvider';
import { MintCheckoutScreen } from '@/screens/MintCheckoutScreen';

export default function MintRoute() {
  const context = useMobileApp();
  const params = useLocalSearchParams<{
    merchantId?: string | string[];
    amount?: string | string[];
    region?: string | string[];
  }>();
  const routeState = useCheckoutRoute({
    amount: params.amount,
    context,
    merchantId: params.merchantId,
    region: params.region
  });

  if (context.wallet.snapshot.status !== 'connected') {
    return <Redirect href="/onboarding" />;
  }

  if (routeState.status === 'ready') {
    return (
      <AppRouteFrame scroll={false}>
        <MintCheckoutScreen context={context} />
      </AppRouteFrame>
    );
  }

  return (
    <AppRouteFrame scroll={false}>
      <RouteState
        actionLabel={routeState.status === 'loading' ? undefined : 'Back to search'}
        body={routeState.message ?? 'Preparing checkout.'}
        loading={routeState.status === 'loading'}
        onAction={routeState.status === 'loading' ? undefined : () => context.goToTab('catalogue')}
        title={routeState.status === 'loading' ? 'Preparing checkout' : 'Giftcard unavailable'}
      />
    </AppRouteFrame>
  );
}
