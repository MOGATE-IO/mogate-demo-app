import { afterEach, describe, expect, it, vi } from 'vitest';

import { getNetworkProfile } from '../src/config/networkProfiles';
import type { PreparedUnsafeCheckout } from '../src/features/checkout/services/giftcardCheckout';

const checkout = {
  gatewayVersion: 'v2',
  checkoutId: 'checkout-1',
  orderId: 'order-1',
  collection: '0x2222222222222222222222222222222222222222',
  to: '0x1111111111111111111111111111111111111111',
  uri: 'ipfs://giftcard',
  paymentToken: '0x0000000000000000000000000000000000000000',
  amountAtomic: 0n,
  amountDisplay: '0',
  currency: 'ETH',
  tokenDecimals: 18,
  tokenType: 'native'
} satisfies PreparedUnsafeCheckout;

const testnetProfile = getNetworkProfile('testnet');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('checkout reconciliation service', () => {
  it('skips when no endpoint is configured', async () => {
    const { reconcileUaMint } = await import('../src/features/checkout/services/checkoutReconciliation');

    const result = await reconcileUaMint({
      ownerAddress: checkout.to,
      checkout,
      profile: {
        ...testnetProfile,
        checkoutReconcileEndpoint: ''
      },
      mintResult: {
        transaction: {} as any,
        result: { transactionId: 'ua-1' },
        authorizations: [],
        tokenId: '1',
        universalXUrl: 'https://universalx.app/activity/details?id=ua-1'
      }
    });

    expect(result.status).toBe('skipped');
  });

  it('posts checkout and UA transaction details to the configured endpoint', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      return {
        ok: true,
        json: async () => ({
          ok: true,
          record: body
        })
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    const { reconcileUaMint } = await import('../src/features/checkout/services/checkoutReconciliation');

    const result = await reconcileUaMint({
      ownerAddress: checkout.to,
      checkout,
      profile: {
        ...testnetProfile,
        checkoutReconcileEndpoint: 'http://localhost:4000/api/checkouts/reconcile'
      },
      mintResult: {
        transaction: {} as any,
        result: {
          transactionId: 'ua-1',
          receipt: {
            transactionHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
          }
        },
        authorizations: [],
        tokenId: '3',
        universalXUrl: 'https://universalx.app/activity/details?id=ua-1'
      }
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init.body));
    expect(result.status).toBe('recorded');
    expect(body).toMatchObject({
      checkoutId: 'checkout-1',
      orderId: 'order-1',
      gatewayVersion: 'v2',
      ownerAddress: checkout.to,
      receiver: checkout.to,
      tokenId: '3',
      transactionId: 'ua-1',
      transactionHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    });
  });
});
