import { Interface } from 'ethers';
import { describe, expect, it } from 'vitest';

import {
  ERC20_APPROVAL_ABI,
  MOGATE_UA_FUNDED_GATEWAY_ABI,
  ZERO_ADDRESS
} from '../src/config/contracts';
import { getNetworkProfile } from '../src/config/networkProfiles';
import {
  buildGiftcardMintCalls,
  parsePreparedCheckoutJson
} from '../src/features/checkout/services/giftcardCheckout';

const gateway = '0x1111111111111111111111111111111111111111';
const collection = '0x2222222222222222222222222222222222222222';
const owner = '0x3333333333333333333333333333333333333333';
const usdc = '0x16369CD4B9533795dCdc0D67DB3E4c621ef97D68';
const dai = '0x5555555555555555555555555555555555555555';
const signature = `0x${'11'.repeat(65)}`;
const testnetProfile = getNetworkProfile('testnet');

function response() {
  return {
    checkout_id: 'funded-1',
    status: 'prepared',
    currency: 'USDC',
    total_amount: 335,
    direct_payment: { amount: 335 },
    prepared: {
      giftcard_type: 'funded',
      permit: {
        token_decimals: 6,
        execution: {
          evm: {
            mode: 'atomic_checkout',
            entrypoint: 'checkout',
            order_id: 'funded-1',
            funded_checkout: {
              version: '2',
              chain_id: 11155111,
              gateway_address: gateway,
              collection_address: collection,
              payer: owner,
              to: owner,
              order_id: 'funded-1',
              uri: 'ipfs://funded-card',
              service_fee: {
                token: usdc,
                amount: '10000000'
              },
              funding: [
                { token: usdc, amount: '300000000', symbol: 'USDC', decimals: 6 },
                { token: dai, amount: '25000000000000000000', symbol: 'DAI', decimals: 18 },
                { token: ZERO_ADDRESS, amount: '200000000000000000', symbol: 'ETH', decimals: 18 }
              ],
              permit: {
                gas_reserve_amount: '10000000000000000',
                nonce: '7',
                deadline: '2000000000'
              },
              value_policy: 'fixed',
              value_policy_code: 0,
              value_is_fixed: true,
              is_multi_token: true,
              signer: '0x7777777777777777777777777777777777777777',
              signature,
              funding_hash: `0x${'22'.repeat(32)}`,
              digest: `0x${'33'.repeat(32)}`,
              required_native_value: '210000000000000000'
            }
          }
        }
      }
    }
  };
}

describe('signed multi-asset funded checkout', () => {
  it('parses backend EIP-712 terms and builds all atomic calls', () => {
    const profile = testnetProfile;
    const checkout = parsePreparedCheckoutJson(
      JSON.stringify(response()),
      owner,
      profile
    );

    expect(checkout.gatewayVersion).toBe('signed-v2');
    expect(checkout.payer).toBe(owner);
    expect(checkout.fundedAssets).toHaveLength(3);
    expect(checkout.gasReserve?.amountAtomic).toBe(10_000_000_000_000_000n);
    expect(checkout.checkoutTotalDisplay).toBe('335');

    const calls = buildGiftcardMintCalls(checkout, profile);
    expect(calls.transactions).toHaveLength(4);

    const approvalInterface = new Interface(ERC20_APPROVAL_ABI);
    const paymentApproval = approvalInterface.decodeFunctionData(
      'approve',
      calls.transactions[0].data
    );
    expect(paymentApproval[0]).toBe(gateway);
    expect(paymentApproval[1]).toBe(10_000_000n);

    const usdcFundingApproval = approvalInterface.decodeFunctionData(
      'approve',
      calls.transactions[1].data
    );
    expect(usdcFundingApproval[0]).toBe(collection);
    expect(usdcFundingApproval[1]).toBe(300_000_000n);

    const daiFundingApproval = approvalInterface.decodeFunctionData(
      'approve',
      calls.transactions[2].data
    );
    expect(daiFundingApproval[0]).toBe(collection);
    expect(daiFundingApproval[1]).toBe(25_000_000_000_000_000_000n);

    const gatewayInterface = new Interface(MOGATE_UA_FUNDED_GATEWAY_ABI);
    const checkoutCall = gatewayInterface.decodeFunctionData(
      'checkout',
      calls.transactions[3].data
    );
    expect(calls.transactions[3].to).toBe(gateway);
    expect(BigInt(calls.transactions[3].value ?? '0x0')).toBe(210_000_000_000_000_000n);
    expect(checkoutCall[0].collection).toBe(collection);
    expect(checkoutCall[0].to).toBe(owner);
    expect(checkoutCall[1].amount).toBe(10_000_000n);
    expect(checkoutCall[2]).toHaveLength(3);
    expect(checkoutCall[3].gasReserveAmount).toBe(10_000_000_000_000_000n);
    expect(checkoutCall[3].nonce).toBe(7n);
    expect(checkoutCall[4]).toBe(0n);
    expect(checkoutCall[5]).toBe(signature);
  });

  it('rejects a backend native-value total that does not match signed assets', () => {
    const payload = response();
    payload.prepared.permit.execution.evm.funded_checkout.required_native_value = '1';
    const checkout = parsePreparedCheckoutJson(
      JSON.stringify(payload),
      owner,
      testnetProfile
    );

    expect(() => buildGiftcardMintCalls(checkout, testnetProfile)).toThrow(/required_native_value/);
  });
});
