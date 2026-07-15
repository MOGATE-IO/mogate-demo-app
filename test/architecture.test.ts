import { describe, expect, it } from 'vitest';

import { getCheckoutRouteSelection } from '../src/features/checkout/services/checkoutRoute';
import { MAIN_TAB_PATHS, MAIN_TAB_ROUTES } from '../src/navigation/tabs';
import { normalizeLocalAssetPath } from '../src/utils/assetPaths';

const merchant = {
  id: 'mogate',
  backendBrandId: 'mogate_giftcard',
  regions: ['GLOBAL', 'ID'],
  name: 'Mogate Giftcard',
  category: 'Digital',
  description: 'Funded giftcard',
  heroColor: ['#ffffff', '#f5f5f5', '#fff0e5'] as const,
  availableAmounts: [0.1, 1, 5],
  currency: 'USD',
  views: 0,
  recentPurchases: 0,
  chains: ['Arbitrum']
};

describe('mobile route architecture', () => {
  it('maps all five route files to stable product tabs', () => {
    expect(MAIN_TAB_ROUTES).toEqual({
      index: 'home',
      search: 'search',
      request: 'request',
      inventory: 'inventory',
      profile: 'profile'
    });
    expect(MAIN_TAB_PATHS.inventory).toBe('/inventory');
  });

  it('rehydrates checkout state from route parameters', () => {
    expect(
      getCheckoutRouteSelection({ amount: '1', merchant, region: 'ID' })
    ).toMatchObject({ amount: 1, merchant, region: 'ID' });
    expect(
      getCheckoutRouteSelection({ amount: 'invalid', merchant, region: undefined })
    ).toMatchObject({ amount: 0.1, region: 'GLOBAL' });
  });

  it('normalizes frontend-relative asset paths without treating remote URLs as local', () => {
    expect(normalizeLocalAssetPath('/images/company/lezgo_logo_white.svg?version=1')).toBe(
      '/images/company/lezgo_logo_white.svg'
    );
    expect(normalizeLocalAssetPath('https://mogate.io/images/company/lezgo_logo_white.svg')).toBeNull();
  });
});
