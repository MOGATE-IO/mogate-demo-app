import { Interface } from 'ethers';
import { describe, expect, it } from 'vitest';

import {
  ERC20_APPROVAL_ABI,
  MOGATE_UA_MINT_GATEWAY_V2_ABI,
  ZERO_ADDRESS
} from '../src/config/contracts';
import {
  buildGiftcardMintCalls,
  type PreparedUnsafeCheckout
} from '../src/features/checkout/services/giftcardCheckout';

const gateway = '0x1111111111111111111111111111111111111111';
const collection = '0x2222222222222222222222222222222222222222';
const owner = '0x3333333333333333333333333333333333333333';
const paymentToken = '0x4444444444444444444444444444444444444444';
const valueToken = '0x5555555555555555555555555555555555555555';
const paymentRecipient = '0x6666666666666666666666666666666666666666';

function checkout(overrides: Partial<PreparedUnsafeCheckout> = {}): PreparedUnsafeCheckout {
  return {
    gatewayVersion: 'v2',
    gatewayAddress: gateway,
    checkoutId: 'checkout-1',
    orderId: 'order-1',
    collection,
    to: owner,
    uri: 'ipfs://giftcard',
    paymentToken,
    amountAtomic: 10_000_000n,
    amountDisplay: '10',
    currency: 'USDC',
    tokenDecimals: 6,
    tokenType: 'erc20',
    paymentRecipient,
    funded: {
      token: valueToken,
      amountAtomic: 50_000_000n,
      amountDisplay: '50',
      currency: 'USDC',
      tokenDecimals: 6
    },
    gasReserve: {
      amountAtomic: 1_000_000_000_000_000n,
      amountDisplay: '0.001',
      currency: 'ETH'
    },
    ...overrides
  };
}

describe('v2 giftcard mint transaction builder', () => {
  const approvalInterface = new Interface(ERC20_APPROVAL_ABI);
  const gatewayInterface = new Interface(MOGATE_UA_MINT_GATEWAY_V2_ABI);

  it('builds payment approval, funding approval, and checkout call for ERC20 funded mint', () => {
    const calls = buildGiftcardMintCalls(checkout());

    expect(calls.chainId).toBe(42161);
    expect(calls.transactions).toHaveLength(3);

    const paymentApproval = approvalInterface.decodeFunctionData(
      'approve',
      calls.transactions[0].data
    );
    expect(calls.transactions[0]).toMatchObject({
      to: paymentToken,
      value: '0x0'
    });
    expect(paymentApproval[0]).toBe(gateway);
    expect(paymentApproval[1]).toBe(10_000_000n);

    const fundingApproval = approvalInterface.decodeFunctionData(
      'approve',
      calls.transactions[1].data
    );
    expect(calls.transactions[1]).toMatchObject({
      to: valueToken,
      value: '0x0'
    });
    expect(fundingApproval[0]).toBe(collection);
    expect(fundingApproval[1]).toBe(50_000_000n);

    const checkoutCall = gatewayInterface.decodeFunctionData(
      'checkoutFundedV2',
      calls.transactions[2].data
    );
    expect(calls.transactions[2]).toMatchObject({
      to: gateway
    });
    expect(BigInt(calls.transactions[2].value ?? '0x0')).toBe(1_000_000_000_000_000n);
    expect(checkoutCall[0].to).toBe(owner);
    expect(checkoutCall[0].collection).toBe(collection);
    expect(checkoutCall[1].token).toBe(paymentToken);
    expect(checkoutCall[1].amount).toBe(10_000_000n);
    expect(checkoutCall[1].recipient).toBe(paymentRecipient);
    expect(checkoutCall[2].valueToken).toBe(valueToken);
    expect(checkoutCall[2].valueAmount).toBe(50_000_000n);
    expect(checkoutCall[2].gasReserveAmount).toBe(1_000_000_000_000_000n);
  });

  it('builds a single native checkout call with combined native value', () => {
    const calls = buildGiftcardMintCalls(
      checkout({
        paymentToken: ZERO_ADDRESS,
        amountAtomic: 20_000_000_000_000_000n,
        tokenType: 'native',
        funded: {
          token: ZERO_ADDRESS,
          amountAtomic: 100_000_000_000_000_000n,
          amountDisplay: '0.1',
          currency: 'ETH',
          tokenDecimals: 18
        },
        gasReserve: {
          amountAtomic: 5_000_000_000_000_000n,
          amountDisplay: '0.005',
          currency: 'ETH'
        }
      })
    );

    expect(calls.transactions).toHaveLength(1);
    expect(calls.transactions[0]).toMatchObject({
      to: gateway
    });
    expect(BigInt(calls.transactions[0].value ?? '0x0')).toBe(125_000_000_000_000_000n);

    const decoded = gatewayInterface.decodeFunctionData(
      'checkoutFundedV2',
      calls.transactions[0].data
    );
    expect(decoded[1].token).toBe(ZERO_ADDRESS);
    expect(decoded[1].amount).toBe(20_000_000_000_000_000n);
    expect(decoded[2].valueToken).toBe(ZERO_ADDRESS);
    expect(decoded[2].valueAmount).toBe(100_000_000_000_000_000n);
    expect(decoded[2].gasReserveAmount).toBe(5_000_000_000_000_000n);
  });

  it('encodes zero-address payment recipient when payment amount is zero', () => {
    const calls = buildGiftcardMintCalls(
      checkout({
        paymentToken: ZERO_ADDRESS,
        amountAtomic: 0n,
        tokenType: 'native',
        paymentRecipient: undefined,
        funded: null,
        gasReserve: null
      })
    );

    expect(calls.transactions).toHaveLength(1);
    const decoded = gatewayInterface.decodeFunctionData(
      'checkoutFundedV2',
      calls.transactions[0].data
    );

    expect(decoded[1].token).toBe(ZERO_ADDRESS);
    expect(decoded[1].amount).toBe(0n);
    expect(decoded[1].recipient).toBe(ZERO_ADDRESS);
    expect(decoded[2].valueAmount).toBe(0n);
    expect(decoded[2].gasReserveAmount).toBe(0n);
  });
});
