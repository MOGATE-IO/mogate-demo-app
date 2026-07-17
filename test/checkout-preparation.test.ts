import { afterEach, describe, expect, it, vi } from 'vitest';

import { getDefaultNetworkProfile } from '../src/config/networkProfiles';
import {
  buildGiftcardMintCalls,
  fetchPreparedCheckout,
  parsePreparedCheckoutJson
} from '../src/features/checkout/services/giftcardCheckout';

const receiver = '0x1111111111111111111111111111111111111111';
const paymentToken = '0x16369CD4B9533795dCdc0D67DB3E4c621ef97D68';
const signature = `0x${'11'.repeat(65)}`;

function preparedResponse() {
  return {
    checkout_id: 'checkout-1',
    status: 'prepared',
    currency: 'USDC',
    direct_payment: {
      amount: 0.1
    },
    prepared: {
      encryption: {
        cipher_ref: 'https://example.com/ciphertext',
        key_handle: JSON.stringify({
          ctHash: '1234',
          securityZone: 0,
          utype: 6,
          signature
        })
      },
      permit: {
        execution: {
          evm: {
            amount: '100000',
            cipher_ref: 'https://example.com/ciphertext',
            enc_key: JSON.stringify({
              ctHash: '1234',
              securityZone: 0,
              utype: 6,
              signature
            }),
            entrypoint: 'unsafeCheckout',
            order_id: 'checkout-1',
            to: receiver,
            token_address: paymentToken,
            token_type: 'erc20',
            uri: 'https://example.com/metadata.json'
          }
        }
      }
    }
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('checkout preparation', () => {
  it('recognizes the legacy voucher unsafeCheckout payload as v0', () => {
    const checkout = parsePreparedCheckoutJson(
      JSON.stringify(preparedResponse()),
      receiver,
      getDefaultNetworkProfile()
    );

    expect(checkout).toMatchObject({
      gatewayVersion: 'v0',
      gatewayAddress: '0x98f7EBAedE6248a98a7B9107307EA2d56b143759',
      collection: '0x4cf031C2ecf8ee6b08bF7ab16a49636A0FADBF9D',
      amountAtomic: 100000n,
      paymentToken,
      tokenType: 'erc20'
    });
    expect(checkout.encKey?.ctHash).toBe(1234n);

    const calls = buildGiftcardMintCalls(checkout);
    expect(calls.chainId).toBe(11155111);
    expect(calls.transactions.at(-1)?.to).toBe(
      '0x98f7EBAedE6248a98a7B9107307EA2d56b143759'
    );
  });

  it('creates an atomic direct USDC checkout and polls its status', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        payment_options: [{
          network: 'ethereum',
          cluster: 'testnet',
          payment_options: [{
            payment_method: 'wallet:USDC',
            payment_currency: 'USDC',
            token_address: paymentToken,
            token_decimals: 6,
            token_type: 'erc20',
            is_confidential: false,
            is_enabled: true,
            execution_mode: 'atomic_checkout'
          }]
        }]
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        checkout_id: 'checkout-1',
        status: 'preparing',
        product_type: 'giftcard'
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(preparedResponse()), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const checkout = await fetchPreparedCheckout(receiver, getDefaultNetworkProfile(), {
      merchantId: 'mogate',
      amountDisplay: '0.1',
      network: 'ethereum',
      giftcardMode: 'voucher',
      region: 'GLOBAL'
    });

    const createRequest = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(createRequest).toMatchObject({
      flow: 'atomic_onchain',
      system: {
        payment_path: 'direct',
        payment_currency: 'USDC'
      },
      context: {
        funding_mode: 'voucher',
        network: 'ethereum'
      }
    });
    expect(fetchMock.mock.calls[2][0]).toContain('/giftcard/checkout/checkout-1/status');
    expect(checkout.gatewayVersion).toBe('v0');
  });

  it('defaults a new checkout to a fixed funded card with direct gas reserve', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        payment_options: [{
          network: 'ethereum',
          cluster: 'testnet',
          payment_options: [{
            payment_method: 'wallet:USDC',
            payment_currency: 'USDC',
            token_address: paymentToken,
            token_decimals: 6,
            token_type: 'erc20',
            is_confidential: false,
            is_enabled: true,
            execution_mode: 'atomic_checkout'
          }]
        }]
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        checkout_id: 'checkout-1',
        status: 'preparing',
        product_type: 'giftcard'
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(preparedResponse()), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchPreparedCheckout(receiver, getDefaultNetworkProfile(), {
      merchantId: 'mogate',
      amountDisplay: '50',
      network: 'ethereum',
      region: 'GLOBAL'
    });

    const createRequest = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(createRequest).toMatchObject({
      giftcard_type: 'funded',
      system: {
        backing_mode: 'onchain_funded',
        security_mode: 'safe',
        reserved_gas: {
          enabled: true,
          source: 'direct'
        },
        funded: {
          value_policy: 'fixed',
          is_multi_token: false
        }
      },
      context: {
        funding_mode: 'funded'
      }
    });
  });
});
