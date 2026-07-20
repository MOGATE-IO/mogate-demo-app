import { Signature, formatUnits } from 'ethers';
import type {
  EIP7702Authorization,
  IExpectToken,
  ITransaction,
  ITransferTransaction
} from '@particle-network/universal-account-sdk';

import {
  getDefaultNetworkProfile,
  hasParticleProjectConfig,
  type RuntimeNetworkProfile
} from '@/config/networkProfiles';
import { ZERO_ADDRESS } from '@/config/contracts';
import type { UnifiedBalance, WalletAdapter } from '@/@web3/types/wallet';
import { withTimeout } from '@/utils/async';
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
  primaryAssets?: UnifiedBalance | null;
  deployments?: Record<string, unknown>[] | null;
};

export type UaMintResult = {
  transaction: ITransaction;
  result: Record<string, unknown>;
  authorizations: EIP7702Authorization[];
  tokenId?: string;
  transactionHash?: string;
  universalXUrl?: string;
};

export type UaTransactionResult = {
  transaction: ITransaction;
  result: Record<string, unknown>;
  authorizations: EIP7702Authorization[];
  transactionHash?: string;
  universalXUrl?: string;
};

export type UaFeeSummary = {
  totalFeeUsd: number;
  gasFeeUsd: number;
  serviceFeeUsd: number;
  lpFeeUsd: number;
  feeSymbols: string[];
  freeGasFee: boolean;
};

export type UaExecutionProgress = 'routing' | 'authorizing' | 'submitting' | 'minting';

function getSdkCredentials(profile: RuntimeNetworkProfile = getDefaultNetworkProfile()) {
  if (!hasParticleProjectConfig(profile)) {
    throw new Error(
      'Particle UA is required for Mainnet checkout. Configure EXPO_PUBLIC_PARTICLE_PROJECT_ID, EXPO_PUBLIC_PARTICLE_CLIENT_KEY, and EXPO_PUBLIC_PARTICLE_APP_ID.'
    );
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
    smartAccountOptions: {
      useEIP7702: true,
      name: 'UNIVERSAL',
      version: sdk.UNIVERSAL_ACCOUNT_VERSION,
      ownerAddress
    },
    tradeConfig: {
      slippageBps: 100,
      preferTokenType: sdk.PREFER_TOKEN_TYPE.USD,
      usePrimaryTokens: [
        sdk.SUPPORTED_TOKEN_TYPE.USDC,
        sdk.SUPPORTED_TOKEN_TYPE.USDT
      ]
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

export function findTransactionHash(value: unknown, depth = 0): string | undefined {
  if (depth > 5 || value == null) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const hash = findTransactionHash(item, depth + 1);
      if (hash) return hash;
    }
    return undefined;
  }
  if (typeof value !== 'object') return undefined;

  const record = value as Record<string, unknown>;
  for (const key of ['transactionHash', 'txHash', 'hash']) {
    const candidate = record[key];
    if (typeof candidate === 'string' && /^0x[a-fA-F0-9]{64}$/.test(candidate)) {
      return candidate;
    }
  }
  for (const nested of Object.values(record)) {
    const hash = findTransactionHash(nested, depth + 1);
    if (hash) return hash;
  }
  return undefined;
}

export function getUniversalTransactionState(value: unknown) {
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  const rawState =
    record.status ??
    record.state ??
    record.transactionStatus ??
    (record.result as Record<string, unknown> | undefined)?.status ?? '';
  if (typeof rawState === 'number') {
    return [
      'initializing',
      'deposit_local',
      'deposit_pending',
      'wait_to_refund',
      'execution_local',
      'execution_pending',
      'execution_failed',
      'finished',
      'refund_local',
      'refund_pending',
      'refund_failed',
      'refund_finished',
      'penny_local',
      'penny_pending',
      'penny_failed'
    ][rawState] ?? String(rawState);
  }
  return String(rawState).toLowerCase();
}

export async function waitForUniversalTransaction(
  ua: { getTransaction: (transactionId: string) => Promise<unknown> },
  transactionId: string,
  initialResult: Record<string, unknown>
) {
  if (!transactionId) {
    throw new Error('Particle did not return a Universal Transaction ID.');
  }

  let latest = initialResult;
  for (let attempt = 0; attempt < 36; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
    const status = await withTimeout(
      ua.getTransaction(transactionId),
      15_000,
      'Particle transaction status did not respond within 15 seconds.'
    );
    if (status && typeof status === 'object') {
      latest = { ...initialResult, ...(status as Record<string, unknown>) };
    }
    const state = getUniversalTransactionState(latest);
    if (state === 'refund_finished') {
      throw new Error(
        `Particle Universal Transaction ${transactionId} failed on the target chain and finished refunding its routed funds. No giftcard was minted.`
      );
    }
    if (/(fail|revert|cancel|reject|refund_finished)/.test(state)) {
      throw new Error(`Particle Universal Transaction ${transactionId} ended with status ${state}.`);
    }
    if (state === 'finished' || /(success|complete|confirm|final)/.test(state)) {
      return latest;
    }
  }

  const transactionHash = findTransactionHash(latest);
  throw new Error(
    `Particle Universal Transaction ${transactionId} did not reach a final status within 3 minutes${transactionHash ? ` (${transactionHash})` : ''}. Check its status before retrying.`
  );
}

function finiteNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Returns the fee deduction Particle quoted for the selected route. */
export function getUaFeeSummary(transaction: ITransaction): UaFeeSummary {
  const quote = transaction.feeQuotes?.[0]?.fees;
  const totals = quote?.totals;
  const feeSymbols = Array.from(new Set(
    (quote?.feeTokens ?? [])
      .map((feeToken) => feeToken.token.symbol ?? feeToken.token.type ?? '')
      .filter(Boolean)
      .map((symbol) => String(symbol).toUpperCase())
  ));

  return {
    totalFeeUsd: finiteNumber(totals?.feeTokenAmountInUSD ?? transaction.tokenChanges?.totalFeeInUSD),
    gasFeeUsd: finiteNumber(totals?.gasFeeTokenAmountInUSD),
    serviceFeeUsd: finiteNumber(totals?.transactionServiceFeeTokenAmountInUSD),
    lpFeeUsd: finiteNumber(totals?.transactionLPFeeTokenAmountInUSD),
    feeSymbols,
    freeGasFee: Boolean(quote?.freeGasFee ?? transaction.transactionFees?.freeGasFee)
  };
}

export async function createUaTransferQuote(input: {
  ownerAddress: string;
  transfer: ITransferTransaction;
  profile?: RuntimeNetworkProfile;
}) {
  const profile = input.profile ?? getDefaultNetworkProfile();
  const ua = await createUniversalAccount(input.ownerAddress, profile);
  const transaction = await withTimeout(
    ua.createTransferTransaction(input.transfer),
    60_000,
    'Particle did not return a transfer route within 60 seconds.'
  );

  return {
    transaction,
    fees: getUaFeeSummary(transaction)
  };
}

/**
 * Signs and submits an already quoted Particle Universal Transaction.
 * The wallet signs a 7702 authorization only when Particle says the EOA has
 * not yet delegated on one of the transaction's execution chains.
 */
export async function submitUaTransaction(input: {
  ownerAddress: string;
  wallet: WalletAdapter;
  transaction: ITransaction;
  profile?: RuntimeNetworkProfile;
  onProgress?: (step: UaExecutionProgress) => void;
}): Promise<UaTransactionResult> {
  const profile = input.profile ?? getDefaultNetworkProfile();
  const ua = await createUniversalAccount(input.ownerAddress, profile);

  input.onProgress?.('authorizing');
  const authorizations = await withTimeout(
    signEip7702Authorizations(input.wallet, input.transaction),
    90_000,
    'The EIP-7702 authorization was not signed within 90 seconds.'
  );
  const signature = await withTimeout(
    input.wallet.signMessage(input.transaction.rootHash),
    90_000,
    'The Universal Account root hash was not signed within 90 seconds.'
  );

  input.onProgress?.('submitting');
  const submittedResult = await withTimeout(
    ua.sendTransaction(
      input.transaction,
      signature,
      authorizations.length > 0 ? authorizations : undefined
    ),
    180_000,
    'Particle did not submit the Universal Transaction within 3 minutes.'
  );

  const transactionId = String(submittedResult.transactionId ?? submittedResult.id ?? '');
  input.onProgress?.('minting');
  const result = await waitForUniversalTransaction(ua, transactionId, submittedResult);
  const transactionHash = findTransactionHash(result);

  return {
    transaction: input.transaction,
    result,
    authorizations,
    transactionHash,
    universalXUrl: transactionId
      ? `https://universalx.app/activity/details?id=${transactionId}`
      : undefined
  };
}

function getTargetStablecoinType(
  tokenAddress: string,
  profile: RuntimeNetworkProfile
) {
  const route = profile.stablecoinRoutes.find(
    (candidate) => candidate.chainId === profile.ua.targetChainId
  );
  return route?.tokens.find(
    (token) => token.address.toLowerCase() === tokenAddress.toLowerCase()
  )?.symbol;
}

export function buildGiftcardExpectTokens(
  sdk: { SUPPORTED_TOKEN_TYPE?: Record<string, string> },
  checkout: PreparedUnsafeCheckout,
  transactions: Array<{ value?: string }>,
  profile: RuntimeNetworkProfile = getDefaultNetworkProfile()
): IExpectToken[] {
  const registry = sdk.SUPPORTED_TOKEN_TYPE ?? {};
  const stablecoinTotals = new Map<string, { amount: bigint; decimals: number }>();
  const addStablecoin = (tokenAddress: string, amount: bigint, decimals: number) => {
    if (amount <= 0n) return;
    if (tokenAddress.toLowerCase() === ZERO_ADDRESS) return;
    const symbol = getTargetStablecoinType(tokenAddress, profile);
    if (symbol !== 'USDC' && symbol !== 'USDT') {
      throw new Error(
        `Particle UA checkout cannot route unsupported target asset ${tokenAddress}.`
      );
    }
    const current = stablecoinTotals.get(symbol);
    if (current && current.decimals !== decimals) {
      throw new Error(`Prepared ${symbol} assets use inconsistent token decimals.`);
    }
    stablecoinTotals.set(symbol, {
      amount: (current?.amount ?? 0n) + amount,
      decimals
    });
  };

  addStablecoin(
    checkout.paymentToken,
    checkout.amountAtomic,
    checkout.tokenDecimals
  );
  for (const asset of checkout.fundedAssets ?? []) {
    addStablecoin(asset.token, asset.amountAtomic, asset.tokenDecimals);
  }

  const expected = Array.from(stablecoinTotals.entries()).map(([symbol, total]) => ({
    type: (registry[symbol] ?? symbol.toLowerCase()) as IExpectToken['type'],
    amount: formatUnits(total.amount, total.decimals)
  }));
  const nativeValue = transactions.reduce(
    (total, transaction) => total + BigInt(transaction.value ?? '0x0'),
    0n
  );
  if (nativeValue > 0n) {
    expected.push({
      type: (registry.ETH ?? 'eth') as IExpectToken['type'],
      amount: formatUnits(nativeValue, 18)
    });
  }

  return expected;
}

export async function signEip7702Authorizations(
  wallet: WalletAdapter,
  transaction: ITransaction
) {
  const authorizations: EIP7702Authorization[] = [];
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

export async function executeUaGiftcardCheckout(input: {
  ownerAddress: string;
  wallet: WalletAdapter;
  checkout: PreparedUnsafeCheckout;
  profile?: RuntimeNetworkProfile;
  onProgress?: (step: UaExecutionProgress) => void;
}): Promise<UaMintResult> {
  const profile = input.profile ?? getDefaultNetworkProfile();
  const sdk = await import('@particle-network/universal-account-sdk');
  const ua = await createUniversalAccount(input.ownerAddress, profile);
  const callSet = buildGiftcardMintCalls(input.checkout, profile);

  input.onProgress?.('routing');
  const transaction = await withTimeout(
    ua.createUniversalTransaction({
      chainId: callSet.chainId,
      expectTokens: buildGiftcardExpectTokens(
        sdk,
        input.checkout,
        callSet.transactions,
        profile
      ),
      transactions: callSet.transactions
    }),
    60_000,
    'Particle did not finish routing the Universal Transaction within 60 seconds.'
  );
  const submitted = await submitUaTransaction({
    ownerAddress: input.ownerAddress,
    wallet: input.wallet,
    transaction,
    profile,
    onProgress: input.onProgress
  });
  const tokenId = extractMintedTokenIdFromReceipt({
    receipt: submitted.result.receipt ?? submitted.result,
    receiver: input.checkout.to,
    collection: input.checkout.collection
  });

  return {
    transaction,
    result: submitted.result,
    authorizations: submitted.authorizations,
    tokenId,
    transactionHash: submitted.transactionHash,
    universalXUrl: submitted.universalXUrl
  };
}
