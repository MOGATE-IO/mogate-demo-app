import { getDefaultNetworkProfile, type RuntimeNetworkProfile } from '@/config/networkProfiles';

import type { PreparedUnsafeCheckout } from './giftcardCheckout';
import type { GiftcardPaymentResult } from './giftcardPayment';

export type CheckoutReconciliationStatus =
  | {
      status: 'idle' | 'skipped';
      detail: string;
    }
  | {
      status: 'recorded';
      detail: string;
      record?: unknown;
    }
  | {
      status: 'error';
      detail: string;
    };

function findTransactionHash(value: any): string {
  const candidates = [
    value?.transactionHash,
    value?.txHash,
    value?.hash,
    value?.receipt?.transactionHash,
    value?.receipt?.txHash,
    value?.transactionReceipt?.transactionHash,
    value?.result?.transactionHash,
    value?.result?.receipt?.transactionHash,
    value?.result?.transactionReceipt?.transactionHash
  ];

  return candidates.find((candidate) => typeof candidate === 'string' && /^0x[a-fA-F0-9]{64}$/.test(candidate)) ?? '';
}

function findTransactionId(result: GiftcardPaymentResult) {
  const value = result.result as Record<string, any>;
  return String(value.transactionId ?? value.id ?? '');
}

export async function reconcileUaMint(input: {
  ownerAddress: string;
  checkout: PreparedUnsafeCheckout;
  mintResult: GiftcardPaymentResult;
  profile?: RuntimeNetworkProfile;
}): Promise<CheckoutReconciliationStatus> {
  const profile = input.profile ?? getDefaultNetworkProfile();

  if (!profile.checkoutReconcileEndpoint) {
    return {
      status: 'skipped',
      detail: 'No checkout reconciliation endpoint configured.'
    };
  }

  const transactionId = findTransactionId(input.mintResult);
  const transactionHash = findTransactionHash(input.mintResult);
  const payload = {
    checkoutId: input.checkout.checkoutId,
    orderId: input.checkout.orderId,
    chainId: profile.ua.targetChainId,
    network: profile.ua.networkName,
    gatewayVersion: input.checkout.gatewayVersion,
    ownerAddress: input.ownerAddress,
    receiver: input.checkout.to,
    collection: input.checkout.collection,
    tokenId: input.mintResult.tokenId || undefined,
    transactionId: transactionId || undefined,
    transactionHash: transactionHash || undefined,
    universalXUrl: input.mintResult.universalXUrl,
    paymentMode: input.mintResult.mode
  };

  const response = await fetch(profile.checkoutReconcileEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      status: 'error',
      detail: `Checkout reconciliation failed ${response.status}: ${body}`
    };
  }

  const body = await response.json();
  return {
    status: 'recorded',
    detail: 'Checkout reconciliation recorded.',
    record: body.record ?? body
  };
}
