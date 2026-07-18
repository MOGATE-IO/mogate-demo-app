import { afterEach, describe, expect, it, vi } from 'vitest';

import { getNetworkProfile } from '../src/config/networkProfiles';
import type { PreparedUnsafeCheckout } from '../src/features/checkout/services/giftcardCheckout';

const checkout = {
  gatewayVersion: 'signed-v2',
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
  it('shows the backend message without dumping its JSON envelope', async () => {
    const { describeReconciliationFailure } = await import('../src/features/checkout/services/checkoutReconciliation');

    expect(describeReconciliationFailure(400, JSON.stringify({
      code: 'failed_precondition',
      message: 'Receipt does not contain the expected ERC721 mint Transfer',
      details: null
    }))).toBe('Receipt does not contain the expected ERC721 mint Transfer');
  });

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

  it('tries every Particle chain hash until OTA verifies the actual mint receipt', async () => {
    const approvalHash = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const mintHash = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.transactionHash === approvalHash) {
        return {
          ok: false,
          status: 412,
          text: async () => 'receipt does not contain a giftcard mint'
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          ok: true,
          record: {
            status: 'minted',
            transaction_hash: mintHash,
            token_id: '3'
          }
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
            transactionHash: approvalHash
          },
          transactions: [{ transactionHash: mintHash }]
        },
        authorizations: [],
        tokenId: '3',
        universalXUrl: 'https://universalx.app/activity/details?id=ua-1'
      }
    });

    const [, init] = fetchMock.mock.calls[1];
    const body = JSON.parse(String(init.body));
    expect(result.status).toBe('recorded');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    if (result.status === 'recorded') {
      expect(result.transactionHash).toBe(mintHash);
      expect(result.tokenId).toBe('3');
    }
    expect(body).toMatchObject({
      checkoutId: 'checkout-1',
      orderId: 'order-1',
      gatewayVersion: 'signed-v2',
      ownerAddress: checkout.to,
      receiver: checkout.to,
      tokenId: '3',
      transactionId: 'ua-1',
      transactionHash: mintHash
    });
  });

  it('does not accept a generic successful HTTP response as mint proof', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, record: { status: 'prepared' } })
    })));
    const { reconcileUaMint } = await import('../src/features/checkout/services/checkoutReconciliation');

    const result = await reconcileUaMint({
      ownerAddress: checkout.to,
      checkout,
      profile: {
        ...testnetProfile,
        checkoutReconcileEndpoint: 'http://localhost:4000/api/checkouts/reconcile'
      },
      mintResult: {
        mode: 'ua7702',
        result: {
          transactionHash: '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
        }
      }
    });

    expect(result.status).toBe('error');
    expect(result.detail).toMatch(/invalid mint record/i);
  });
});
