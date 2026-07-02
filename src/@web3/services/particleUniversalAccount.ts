import { Signature } from 'ethers';
import type {
  Eip7702Authorization,
  ExpectToken,
  UniversalAccountTransaction
} from '@particle-network/universal-account-sdk';

import {
  getDefaultNetworkProfile,
  hasParticleProjectConfig,
  type RuntimeNetworkProfile
} from '@/config/networkProfiles';
import type { WalletAdapter } from '@/@web3/types/wallet';
import { CapabilityBlockedError } from '@/utils/errors';

import type { PreparedUnsafeCheckout } from '@/features/checkout/services/giftcardCheckout';
import {
  buildGiftcardMintCalls,
  extractMintedTokenIdFromReceipt
} from '@/features/checkout/services/giftcardCheckout';

export type UaProbeResult = {
  ownerAddress?: string | null;
  evmUaAddress?: string | null;
  solanaUaAddress?: string | null;
  primaryAssets?: Record<string, unknown> | null;
  deployments?: Record<string, unknown>[] | null;
};

export type UaMintResult = {
  transaction: UniversalAccountTransaction;
  result: Record<string, unknown>;
  authorizations: Eip7702Authorization[];
  tokenId?: string;
  universalXUrl?: string;
};

function getSdkCredentials(profile: RuntimeNetworkProfile = getDefaultNetworkProfile()) {
  if (!hasParticleProjectConfig(profile)) {
    throw new Error('Particle UA project is not configured in src/config/networkProfiles.ts.');
  }
  return profile.particle;
}

export async function createUniversalAccount(
  ownerAddress: string,
  profile: RuntimeNetworkProfile = getDefaultNetworkProfile()
) {
  const credentials = getSdkCredentials(profile);
  const sdk = await import('@particle-network/universal-account-sdk');

  return new sdk.UniversalAccount({
    projectId: credentials.projectId,
    projectClientKey: credentials.clientKey,
    projectAppUuid: credentials.appId,
    ownerAddress,
    smartAccountOptions: {
      useEIP7702: true,
      name: 'UNIVERSAL',
      version: sdk.UNIVERSAL_ACCOUNT_VERSION,
      ownerAddress
    },
    tradeConfig: {
      slippageBps: 100,
      universalGas: true
    }
  });
}

function normalizeSmartAccountOptions(options: Record<string, unknown>) {
  const raw = options as Record<string, any>;
  return {
    ownerAddress: raw.ownerAddress ?? raw.owner,
    evmUaAddress:
      raw.smartAccountAddress ?? raw.evmSmartAccount ?? raw.evmSmartAccountAddress,
    solanaUaAddress:
      raw.solanaSmartAccountAddress ??
      raw.solanaSmartAccount ??
      raw.solanaSmartAccountAddress
  };
}

export async function probeUniversalAccount(
  ownerAddress: string,
  profile: RuntimeNetworkProfile = getDefaultNetworkProfile()
): Promise<UaProbeResult> {
  const ua = await createUniversalAccount(ownerAddress, profile);
  const [smartAccountOptions, primaryAssets, deployments] = await Promise.all([
    ua.getSmartAccountOptions(),
    ua.getPrimaryAssets(),
    ua.getEIP7702Deployments().catch(() => null)
  ]);

  return {
    ...normalizeSmartAccountOptions(smartAccountOptions),
    primaryAssets,
    deployments
  };
}

async function buildExpectTokens(
  sdk: { SUPPORTED_TOKEN_TYPE?: Record<string, string> },
  checkout: PreparedUnsafeCheckout,
  profile: RuntimeNetworkProfile = getDefaultNetworkProfile()
): Promise<ExpectToken[]> {
  if (!profile.ua.expectTokenType) return [];

  const tokenTypeKey = profile.ua.expectTokenType.toUpperCase();
  const registry = sdk.SUPPORTED_TOKEN_TYPE ?? {};
  const tokenType = registry[tokenTypeKey] ?? profile.ua.expectTokenType;
  const amount = profile.ua.expectTokenAmount || checkout.amountDisplay;

  return [
    {
      type: tokenType as ExpectToken['type'],
      amount
    }
  ];
}

async function signEip7702Authorizations(
  wallet: WalletAdapter,
  transaction: UniversalAccountTransaction
) {
  const authorizations: Eip7702Authorization[] = [];
  const nonceSignatures = new Map<string, string>();

  for (const userOp of transaction.userOps ?? []) {
    if (!userOp.eip7702Auth || userOp.eip7702Delegated) continue;
    if (!wallet.sign7702Authorization) {
      throw new CapabilityBlockedError(
        'UA transaction requires an EIP-7702 authorization, but this mobile wallet adapter does not expose a 7702 signing primitive.'
      );
    }

    const nonceKey = [
      userOp.eip7702Auth.chainId,
      userOp.eip7702Auth.address,
      userOp.eip7702Auth.nonce
    ].join(':');
    let signature = nonceSignatures.get(nonceKey);
    if (!signature) {
      const signed = await wallet.sign7702Authorization({
        address: userOp.eip7702Auth.address as `0x${string}`,
        chainId: Number(userOp.eip7702Auth.chainId),
        nonce: userOp.eip7702Auth.nonce
      });
      signature = Signature.from(signed.signature).serialized;
      nonceSignatures.set(nonceKey, signature);
    }

    authorizations.push({
      userOpHash: userOp.userOpHash,
      signature
    });
  }

  return authorizations;
}

export async function executeUaUnsafeCheckout(input: {
  ownerAddress: string;
  wallet: WalletAdapter;
  checkout: PreparedUnsafeCheckout;
  profile?: RuntimeNetworkProfile;
}): Promise<UaMintResult> {
  const profile = input.profile ?? getDefaultNetworkProfile();
  const sdk = await import('@particle-network/universal-account-sdk');
  const ua = await createUniversalAccount(input.ownerAddress, profile);
  const callSet = buildGiftcardMintCalls(input.checkout, profile);

  const transaction = await ua.createUniversalTransaction({
    chainId: callSet.chainId,
    expectTokens: await buildExpectTokens(sdk, input.checkout, profile),
    transactions: callSet.transactions
  });

  const authorizations = await signEip7702Authorizations(input.wallet, transaction);
  const signature = await input.wallet.signMessage(transaction.rootHash);
  const result = await ua.sendTransaction(
    transaction,
    signature,
    authorizations.length > 0 ? authorizations : undefined
  );

  const transactionId = String(result.transactionId ?? result.id ?? '');
  const tokenId = extractMintedTokenIdFromReceipt({
    receipt: result.receipt ?? result,
    receiver: input.checkout.to,
    collection: input.checkout.collection
  });

  return {
    transaction,
    result,
    authorizations,
    tokenId,
    universalXUrl: transactionId
      ? `https://universalx.app/activity/details?id=${transactionId}`
      : undefined
  };
}
