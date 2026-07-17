import { Wallet } from 'ethers';
import { describe, expect, it } from 'vitest';

import {
  assertSignedDirectTransaction,
  buildDirectTransactionRequest,
  buildPrivyUnsignedTransaction
} from '../src/features/checkout/services/giftcardPayment';

describe('direct giftcard payment transaction requests', () => {
  it('includes a buffered nonzero gas limit for Privy transaction submission', () => {
    const request = buildDirectTransactionRequest(
      {
        to: '0x1111111111111111111111111111111111111111',
        data: '0x095ea7b3',
        value: '0x0'
      },
      50_001n
    );

    expect(request.gasLimit).toBe(60_002n);
    expect(request.value).toBe(0n);
  });

  it('rejects a zero gas estimate instead of signing an invalid transaction', () => {
    expect(() =>
      buildDirectTransactionRequest(
        {
          to: '0x1111111111111111111111111111111111111111',
          data: '0x095ea7b3',
          value: '0x0'
        },
        0n
      )
    ).toThrow(/zero gas estimate/i);
  });

  it('caps an unexpectedly large RPC estimate', () => {
    const request = buildDirectTransactionRequest(
      {
        to: '0x1111111111111111111111111111111111111111',
        data: '0x095ea7b3',
        value: '0x0'
      },
      20_000_000n
    );

    expect(request.gasLimit).toBe(16_777_215n);
  });

  it('uses Privy gasLimit and verifies it in the signed raw transaction', async () => {
    const wallet = new Wallet(`0x${'11'.repeat(32)}`);
    const unsignedTransaction = buildPrivyUnsignedTransaction({
      call: {
        to: '0x1111111111111111111111111111111111111111',
        data: '0x095ea7b3',
        value: '0x0'
      },
      estimatedGas: 46_304n,
      nonce: 0,
      chainId: 11_155_111,
      ownerAddress: wallet.address,
      feeData: {
        gasPrice: null,
        maxFeePerGas: 2_000_000_000n,
        maxPriorityFeePerGas: 1_000_000n
      }
    });

    expect(unsignedTransaction).toHaveProperty('gasLimit', '0xd90d');
    expect(unsignedTransaction).not.toHaveProperty('gas');

    const signedTransaction = await wallet.signTransaction(unsignedTransaction);
    expect(
      assertSignedDirectTransaction({ signedTransaction, unsignedTransaction })
    ).toBe(signedTransaction);
  });
});
