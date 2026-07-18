import { TypedDataEncoder, Wallet, keccak256, toUtf8Bytes } from 'ethers';
import { describe, expect, it } from 'vitest';

import { ZERO_ADDRESS } from '../src/config/contracts';
import { getNetworkProfile } from '../src/config/networkProfiles';
import type { HexString } from '../src/@web3/types/wallet';
import {
  assertPreparedFundedCheckoutIntegrity,
  hashPreparedFundedAssets,
  type PreparedUnsafeCheckout
} from '../src/features/checkout/services/giftcardCheckout';

const checkoutTypes = {
  Checkout: [
    { name: 'orderIdHash', type: 'bytes32' },
    { name: 'collection', type: 'address' },
    { name: 'payer', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'uriHash', type: 'bytes32' },
    { name: 'feeToken', type: 'address' },
    { name: 'feeAmount', type: 'uint256' },
    { name: 'fundingHash', type: 'bytes32' },
    { name: 'gasReserveAmount', type: 'uint256' },
    { name: 'valuePolicy', type: 'uint8' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
};

async function signedCheckout() {
  const profile = getNetworkProfile('testnet');
  const signer = new Wallet(`0x${'42'.repeat(32)}`);
  const owner = signer.address as HexString;
  const usdc = profile.stablecoinRoutes
    .find((route) => route.chainId === profile.ua.targetChainId)!
    .tokens.find((token) => token.symbol === 'USDC')!.address;
  const funding = [{
    token: usdc,
    amountAtomic: 5_000_000n,
    amountDisplay: '5',
    currency: 'USDC',
    tokenDecimals: 6
  }];
  const fundingHash = hashPreparedFundedAssets(funding);
  const orderId = 'integrity-test-order';
  const uri = 'https://example.com/funded-card.json';
  const gasReserveAmount = 100_000_000_000_000n;
  const nonce = 77n;
  const deadline = 2_000_000_000n;
  const domain = {
    name: 'AuthorityFundedGiftcardGateway',
    version: '2',
    chainId: profile.ua.targetChainId,
    verifyingContract: profile.gateway.signedAddress
  };
  const message = {
    orderIdHash: keccak256(toUtf8Bytes(orderId)),
    collection: profile.gateway.fundedCollection,
    payer: owner,
    to: owner,
    uriHash: keccak256(toUtf8Bytes(uri)),
    feeToken: usdc,
    feeAmount: 0n,
    fundingHash,
    gasReserveAmount,
    valuePolicy: 0,
    nonce,
    deadline
  };
  const digest = TypedDataEncoder.hash(domain, checkoutTypes, message);
  const signature = await signer.signTypedData(domain, checkoutTypes, message) as HexString;
  const checkout: PreparedUnsafeCheckout = {
    gatewayVersion: 'signed-v2',
    chainId: profile.ua.targetChainId,
    gatewayAddress: profile.gateway.signedAddress,
    checkoutId: orderId,
    orderId,
    collection: profile.gateway.fundedCollection,
    payer: owner,
    to: owner,
    uri,
    paymentToken: usdc,
    amountAtomic: 0n,
    amountDisplay: '0',
    checkoutTotalDisplay: '5',
    currency: 'USDC',
    tokenDecimals: 6,
    tokenType: 'erc20',
    valuePolicy: 'fixed',
    valuePolicyCode: 0,
    valueIsFixed: true,
    isMultiToken: false,
    funded: funding[0],
    fundedAssets: funding,
    gasReserve: {
      amountAtomic: gasReserveAmount,
      amountDisplay: '0.0001',
      currency: 'ETH'
    },
    signedPermit: {
      gasReserveAmount,
      nonce,
      deadline,
      signature,
      signer: signer.address as HexString,
      fundingHash,
      digest
    },
    requiredNativeValue: gasReserveAmount
  };
  return { checkout, owner, profile };
}

describe('funded checkout integrity gate', () => {
  it('recomputes the funded hash and recovers the backend signer', async () => {
    const { checkout, owner, profile } = await signedCheckout();
    const result = assertPreparedFundedCheckoutIntegrity(checkout, owner, profile, 1n);

    expect(result?.digest).toBe(checkout.signedPermit?.digest);
    expect(result?.recoveredSigner).toBe(checkout.signedPermit?.signer);
  });

  it('rejects changed funding before an approval can be submitted', async () => {
    const { checkout, owner, profile } = await signedCheckout();
    const tampered = {
      ...checkout,
      fundedAssets: checkout.fundedAssets?.map((asset) => ({
        ...asset,
        amountAtomic: asset.amountAtomic + 1n
      }))
    };

    expect(() => assertPreparedFundedCheckoutIntegrity(tampered, owner, profile, 1n))
      .toThrow(/funding hash/i);
  });

  it('rejects a different connected payer before an approval can be submitted', async () => {
    const { checkout, profile } = await signedCheckout();

    expect(() => assertPreparedFundedCheckoutIntegrity(
      checkout,
      ZERO_ADDRESS,
      profile,
      1n
    )).toThrow(/payer does not match/i);
  });
});
