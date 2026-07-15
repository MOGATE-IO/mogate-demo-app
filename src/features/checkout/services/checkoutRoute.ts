import type { GiftcardMerchant } from '@/features/catalogue/services/catalogue';
import type { CheckoutSelectionInput } from '@/screens/types';

export type RouteParam = string | string[] | undefined;

export function firstRouteParam(value: RouteParam) {
  return Array.isArray(value) ? value[0] : value;
}

export function getCheckoutRouteSelection({
  amount,
  merchant,
  region
}: {
  amount: RouteParam;
  merchant: GiftcardMerchant;
  region: RouteParam;
}): CheckoutSelectionInput {
  const requestedAmount = Number(firstRouteParam(amount));
  return {
    merchant,
    amount: Number.isFinite(requestedAmount) && requestedAmount > 0
      ? requestedAmount
      : merchant.availableAmounts[0] ?? 0,
    region: firstRouteParam(region) ?? merchant.country ?? merchant.regions[0] ?? 'GLOBAL'
  };
}
