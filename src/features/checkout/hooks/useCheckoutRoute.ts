import { useEffect } from 'react';

import {
  firstRouteParam,
  getCheckoutRouteSelection,
  type RouteParam
} from '@/features/checkout/services/checkoutRoute';
import type { AppScreenContext } from '@/screens/types';

export function useCheckoutRoute({
  amount,
  context,
  merchantId,
  region
}: {
  amount?: RouteParam;
  context: AppScreenContext;
  merchantId?: RouteParam;
  region?: RouteParam;
}) {
  const routeMerchantId = firstRouteParam(merchantId) ?? '';
  const selected = context.checkoutSelection;
  const selectedMatches = selected?.merchant.id === routeMerchantId;
  const merchant = context.catalogue.items.find(
    (item) => item.id === routeMerchantId || item.backendBrandId === routeMerchantId
  );

  useEffect(() => {
    if (selectedMatches || !merchant) return;

    context.prepareCheckout(getCheckoutRouteSelection({ amount, merchant, region }));
  }, [amount, context.prepareCheckout, merchant, region, selectedMatches]);

  if (selectedMatches) return { status: 'ready' as const, message: null };
  if (context.catalogue.loading || merchant) {
    return { status: 'loading' as const, message: 'Loading the selected giftcard.' };
  }
  if (context.catalogue.lastError) {
    return { status: 'error' as const, message: context.catalogue.lastError };
  }
  return { status: 'missing' as const, message: 'This giftcard is not in the active catalogue.' };
}
