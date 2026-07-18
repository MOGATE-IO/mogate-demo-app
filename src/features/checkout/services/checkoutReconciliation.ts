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
      transactionHash: string;
      tokenId: string;
      record: Record<string, unknown>;
    }
  | {
      status: 'error';
      detail: string;
    };

const transactionHashPattern = /^0x[a-fA-F0-9]{64}$/;

export function findTransactionHashes(value: unknown, explicitHash?: string) {
  const hashes = new Set<string>();
  const add = (candidate: unknown) => {
    if (typeof candidate === 'string' && transactionHashPattern.test(candidate)) {
      hashes.add(candidate);
    }
  };

  add(explicitHash);

  const visit = (candidate: unknown, depth = 0) => {
    if (depth > 7 || candidate == null) return;
    if (Array.isArray(candidate)) {
      candidate.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (typeof candidate !== 'object') return;

    const record = candidate as Record<string, unknown>;
    add(record.transactionHash);
    add(record.txHash);
    add(record.hash);
    if (Array.isArray(record.transactionHashes)) {
      record.transactionHashes.forEach(add);
    }
    Object.values(record).forEach((item) => visit(item, depth + 1));
  };

  visit(value);
  return [...hashes];
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
  const transactionHashes = findTransactionHashes(
    input.mintResult.result,
    input.mintResult.transactionHash
  );
  if (transactionHashes.length === 0) {
    return {
      status: 'error',
      detail: 'Particle did not return a target-chain transaction hash. The mint cannot be verified yet.'
    };
  }

  const failures: string[] = [];
  for (const transactionHash of transactionHashes) {
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
      transactionHash,
      universalXUrl: input.mintResult.universalXUrl,
      paymentMode: input.mintResult.mode
    };

    try {
      const response = await fetch(profile.checkoutReconcileEndpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        failures.push(`${transactionHash.slice(0, 10)}: ${describeReconciliationFailure(
          response.status,
          await response.text()
        )}`);
        continue;
      }

      const body = await response.json() as {
        ok?: boolean;
        record?: Record<string, unknown>;
      };
      const record = body.record;
      const recordedHash = String(record?.transaction_hash ?? '');
      const tokenId = String(record?.token_id ?? '');
      if (
        body.ok !== true ||
        record?.status !== 'minted' ||
        !transactionHashPattern.test(recordedHash) ||
        !/^\d+$/.test(tokenId)
      ) {
        failures.push(`${transactionHash.slice(0, 10)}: OTA returned an invalid mint record`);
        continue;
      }

      return {
        status: 'recorded',
        detail: `Minted token ${tokenId} was verified on the target chain.`,
        transactionHash: recordedHash,
        tokenId,
        record
      };
    } catch (error) {
      failures.push(
        `${transactionHash.slice(0, 10)}: ${error instanceof Error ? error.message : 'request failed'}`
      );
    }
  }

  return {
    status: 'error',
    detail: `Mogate could not verify the giftcard mint yet. ${failures.join(' | ')}`
  };
}

export function describeReconciliationFailure(status: number, body: string) {
  const fallback = body.trim() || `Checkout verification returned HTTP ${status}.`;
  try {
    const parsed = JSON.parse(body) as { message?: unknown };
    return typeof parsed.message === 'string' && parsed.message.trim()
      ? parsed.message.trim()
      : fallback;
  } catch {
    return fallback;
  }
}
