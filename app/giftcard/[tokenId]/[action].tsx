import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { AppRouteFrame } from '@/components/AppRouteFrame.ui';
import { RouteState } from '@/components/RouteState.ui';
import {
  getGiftcardActions,
  isGiftcardAction
} from '@/features/inventory/services/giftcardActions';
import { useMobileApp } from '@/providers/MobileAppProvider';
import { GiftcardActionScreen } from '@/screens/GiftcardActionScreen';

export default function GiftcardActionRoute() {
  const context = useMobileApp();
  const router = useRouter();
  const params = useLocalSearchParams<{
    action?: string | string[];
    tokenId?: string | string[];
  }>();
  const action = Array.isArray(params.action) ? params.action[0] : params.action;
  const tokenId = Array.isArray(params.tokenId) ? params.tokenId[0] : params.tokenId;
  const item = context.inventory.items.find((candidate) => candidate.tokenId === tokenId);
  const validAction = isGiftcardAction(action) && item && getGiftcardActions(item).includes(action);

  if (context.wallet.snapshot.status !== 'connected') return <Redirect href="/onboarding" />;

  if (!item || !validAction) {
    return (
      <AppRouteFrame scroll={false}>
        <RouteState
          actionLabel="Back to inventory"
          body="This giftcard action is not available for the connected wallet."
          onAction={() => context.goToTab('inventory')}
          title="Action unavailable"
        />
      </AppRouteFrame>
    );
  }

  return (
    <AppRouteFrame scroll={false}>
      <GiftcardActionScreen action={action} context={context} item={item} onBack={() => router.back()} />
    </AppRouteFrame>
  );
}
